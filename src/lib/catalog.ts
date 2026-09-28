import rawProducts from '../data/products.json';
import rawCategories from '../data/categories.json';
import en from '../data/en.json';
import { asset, type Lang } from '../i18n/ui';

export interface Product {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  price: number;
  priceOld: number | null;
  mark: string | null;
  stock: number;
  categories: string[];
  collections: string[];
  description: string;
  images: number;
  sort: number;
}

export interface Category {
  slug: string;
  title: string;
  count: number;
}

export interface Group {
  id: string;
  categories: Category[];
}

const translations = en as {
  categories: Record<string, string>;
  products: Record<string, { title?: string; description?: string }>;
};

export function getProducts(lang: Lang): Product[] {
  const list = rawProducts as Product[];
  if (lang === 'ru') return list;
  return list.map((p) => {
    const tr = translations.products[p.id];
    return tr ? { ...p, title: tr.title ?? p.title, description: tr.description ?? p.description } : p;
  });
}

export function getCategories(lang: Lang): Category[] {
  const products = rawProducts as Product[];
  return rawCategories.categories
    .map((c) => ({
      slug: c.slug,
      title: lang === 'en' ? translations.categories[c.slug] ?? c.title : c.title,
      count: products.filter((p) => p.categories.includes(c.slug)).length,
    }))
    .filter((c) => c.count > 0);
}

export function getGroups(lang: Lang): Group[] {
  const cats = new Map(getCategories(lang).map((c) => [c.slug, c]));
  return rawCategories.groups.map((g) => ({
    id: g.id,
    categories: g.slugs.map((s) => cats.get(s)).filter((c): c is Category => Boolean(c)),
  }));
}

export const COLLECTIONS = ['new', 'sale', 'last-chance', 'made-in-georgia'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export function getBrands(products: Product[]) {
  return [...new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** In-stock items first, keeping the store's manual order inside each group. */
export function byAvailability(a: Product, b: Product) {
  return Number(b.stock > 0) - Number(a.stock > 0) || a.sort - b.sort;
}

export function discount(p: Product) {
  return p.priceOld ? Math.round((1 - p.price / p.priceOld) * 100) : 0;
}

export function imageUrl(p: Product, index = 0, size: 400 | 900 = 400) {
  return asset(`img/p/${p.id}-${index}-${size}.webp`);
}
