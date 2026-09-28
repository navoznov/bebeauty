// Imports the catalog from the old Tilda store into src/data and public/img.
// Usage: npm run import-data            (data + missing images)
//        npm run import-data -- --force (re-download all images)
import { mkdir, writeFile, access } from 'node:fs/promises';
import sharp from 'sharp';

const API = 'https://store.tildaapi.com/api/getproductslist/';
const STOREPART = '839527404181';
const RECID = '809852448';
const IMG_DIR = new URL('../public/img/p/', import.meta.url);
const DATA_DIR = new URL('../src/data/', import.meta.url);
const SIZES = [400, 900];
const FORCE = process.argv.includes('--force');

// Collections are Tilda "parts" that describe a product state rather than a product type.
const COLLECTIONS = { new: 'new', sale: 'sale', 'last-chance': 'last-chance', 'made-in-georgia': 'made-in-georgia' };

// Category grouping for navigation (slugs from the old site).
const GROUPS = [
  { id: 'face', slugs: ['cleansers', 'makeup-removers', 'tonics-and-hydrolates', 'facial-serums', 'facial-creams', 'eye-creams-and-patches', 'peels-and-enzymes', 'spf', 'face-masks', 'lip-care'] },
  { id: 'makeup', slugs: ['decorative-cosmetics', 'brows-and-lashes'] },
  { id: 'body', slugs: ['body-scrubs', 'shower-gel', 'body-creams', 'natural-soap', 'deodorants', 'intimate-hygiene', 'toothpaste'] },
  { id: 'hair', slugs: ['shampoo', 'hair-care'] },
  { id: 'home', slugs: ['aroma-candles', 'massage-candles', 'room-spray', 'georgian-tea', 'postcards', 'accessories'] },
];

// Known data errors in the source store.
const BRAND_FIXES = [{ match: /berrycup/i, brand: 'BerryCup' }];

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Keeps only simple formatting tags, drops inline styles and empty paragraphs.
function cleanHtml(html) {
  return html
    .replace(/<(\/?)(p|ul|ol|li|strong|em|br)\b[^>]*>/gi, '<$1$2>')
    .replace(/<(?!\/?(p|ul|ol|li|strong|em|br)\b)[^>]+>/gi, '')
    .replace(/<br>\s*(<\/?(ul|ol|li|p)>)/gi, '$1')
    .replace(/(<br>\s*){3,}/gi, '<br><br>')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
}

async function exists(url) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

async function saveImage(src, name) {
  const done = await Promise.all(SIZES.map((w) => exists(new URL(`${name}-${w}.webp`, IMG_DIR))));
  if (!FORCE && done.every(Boolean)) return;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${res.status} ${src}`);
  const buf = Buffer.from(await res.arrayBuffer());
  for (const w of SIZES) {
    await sharp(buf)
      .resize({ width: w, height: w, fit: 'contain', background: '#ffffff', withoutEnlargement: false })
      .flatten({ background: '#ffffff' })
      .webp({ quality: 80 })
      .toFile(new URL(`${name}-${w}.webp`, IMG_DIR).pathname);
  }
}

async function pool(items, size, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

const url = `${API}?storepartuid=${STOREPART}&recid=${RECID}&getparts=true&getoptions=true&slice=1&size=500&c=${Date.now()}`;
const res = await fetch(url, { headers: { Referer: 'https://bebeauty-tbilisi.store/' } });
const data = await res.json();

const partSlug = new Map(data.parts.map((p) => [String(p.uid), p.url.split('/').pop()]));
const categories = data.parts
  .map((p) => ({ slug: p.url.split('/').pop(), title: p.title, sort: p.sort }))
  .filter((c) => !COLLECTIONS[c.slug]);

const products = data.products.map((p) => {
  const title = decode(p.title).trim();
  const parts = JSON.parse(p.partuids || '[]').map((id) => partSlug.get(String(id))).filter(Boolean);
  const gallery = JSON.parse(p.gallery || '[]').map((g) => g.img);
  const fix = BRAND_FIXES.find((f) => f.match.test(title));
  const price = parseFloat(String(p.price).replace(',', '.'));
  const priceOld = parseFloat(String(p.priceold).replace(',', '.')) || null;
  return {
    id: String(p.uid),
    slug: p.url.split('/').pop().replace(/^\d+-\d+-/, ''),
    title,
    brand: fix ? fix.brand : decode(p.brand || '').trim() || null,
    price,
    priceOld: priceOld && priceOld > price ? priceOld : null,
    mark: p.mark || null,
    stock: Number(p.quantity) || 0,
    categories: parts.filter((s) => !COLLECTIONS[s]),
    collections: parts.filter((s) => COLLECTIONS[s]),
    description: cleanHtml(p.text || p.descr || ''),
    images: gallery.length,
    sort: p.sort,
    _gallery: gallery,
  };
});

await mkdir(IMG_DIR, { recursive: true });
await mkdir(DATA_DIR, { recursive: true });

const jobs = products.flatMap((p) => p._gallery.map((src, i) => ({ src, name: `${p.id}-${i}` })));
let n = 0;
await pool(jobs, 8, async (j) => {
  await saveImage(j.src, j.name);
  if (++n % 50 === 0) console.log(`images: ${n}/${jobs.length}`);
});

for (const p of products) delete p._gallery;
products.sort((a, b) => a.sort - b.sort);

// The old store has a few products with identical names; make URLs unique.
const seen = new Map();
for (const p of products) {
  const n = (seen.get(p.slug) || 0) + 1;
  seen.set(p.slug, n);
  if (n > 1) p.slug = `${p.slug}-${n}`;
}

await writeFile(new URL('products.json', DATA_DIR), JSON.stringify(products, null, 1));
await writeFile(new URL('categories.json', DATA_DIR), JSON.stringify({ groups: GROUPS, categories }, null, 1));
console.log(`products: ${products.length}, categories: ${categories.length}, images: ${jobs.length}`);
