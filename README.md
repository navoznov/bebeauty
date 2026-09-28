# BeBeauty

Новая версия сайта магазина натуральной косметики BeBeauty (Тбилиси). Astro, статическая сборка, деплой на GitHub Pages.

```sh
npm install
npm run dev     # http://localhost:4321/bebeauty/
npm run build   # сборка в dist/
```

## Индексация поисковиками

Версия на GitHub Pages закрыта от поисковых систем: на всех страницах стоит `<meta name="robots" content="noindex, nofollow">`. Управляет этим флаг `SITE_NOINDEX` в `src/layouts/Base.astro`.

**Если сайт будет опубликован где-то ещё (свой домен, другой хостинг), поставьте `SITE_NOINDEX = false`, иначе поисковики его не проиндексируют.** Корзина и 404 останутся закрытыми (у них свой проп `noindex`).
