# Field Notes

Field Notes turns a local Twitter/X bookmark export into a fast, searchable technical research dashboard and standalone macOS app. Classification happens at build time, so unrelated material never enters the application index.

The repository contains code and a small synthetic demonstration dataset only. Personal exports, generated indexes, export metadata, application bundles, and installers are intentionally ignored.

## Try the demo

```bash
cd site
npm ci
npm run dev
```

When no `posts.jsonl` exists at the repository root, Field Notes automatically uses `site/examples/posts.sample.jsonl`.

## Use your own export

Place a Twillot-compatible export at `posts.jsonl` in the repository root, then run:

```bash
cd site
npm run dev
```

The source export remains read-only. The generated local index is written to `site/public/data/bookmarks.json`; both paths are ignored by Git.

## Build the macOS app

```bash
cd site
npm run desktop:build
```

The standalone application and installer are generated in `site/release/` and are not versioned.

## Privacy

Do not commit bookmark exports or generated indexes. They can reveal private interests, social context, and source metadata even when the bookmarked posts were public.
