# Field Notes

A local-first, utilitarian single-page dashboard for searching the technical and scientific material in a Twillot bookmark export. It has no backend, database, authentication layer, or server-rendered pages.

## Use it as a macOS app

The standalone build needs no terminal, local server, or internet connection for searching. Open `release/Field Notes.app`, or drag it into the Applications folder. `release/Field Notes.dmg` provides the usual drag-to-Applications installer.

To rebuild the app after changing the code or replacing the bookmark export:

```bash
npm run desktop:build
```

The build is local and ad-hoc signed for personal use. Original-post and linked-resource buttons intentionally open in the default browser.

## Open the library for everyday use

From this folder, run:

```bash
npm run dev
```

Then open `http://localhost:3000`. Keep the terminal window running and press `Ctrl+C` when finished.

If `../posts.jsonl` is absent, the development server uses the synthetic dataset in `examples/posts.sample.jsonl` so the project remains runnable without anyone's personal bookmarks.

## Create and run the portable static build

```bash
npm run build
npm run preview
```

The complete SPA is written to `dist/`. It can be served by any ordinary static file server.

## Search

Ordinary words search the post, quoted context, article preview, author, tags, and linked domains. Search fields can be combined with words:

- `author:simonw`
- `topic:agents`
- `shelf:systems`
- `type:comment postgres`
- `domain:github.com`
- `year:2025 claude`

## Refresh the data

Replace `../posts.jsonl` with a newer Twillot export and restart the site. The compact index is rebuilt automatically. The source export is read-only, never modified, and ignored by Git.

The taxonomy and filtering rules live in `scripts/build-library.mjs`. The generated index lives in `public/data/bookmarks.json` and is also ignored by Git.
