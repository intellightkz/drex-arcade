# Drex Arcade

Static site where Drex, the decision model by [Nace.AI](https://nace.ai/developers), plays games. Every replay uses real answers from the hosted Drex API, recorded one request at a time; no API key or live calls in the site.

- `/` landing
- `/beat/` Beat Drex: sort 15 messages against Drex Max
- `/drexman/` Drexman: Drex Max plays Pac-Man (a built fork of [jevman](https://github.com/joch/jevman) by Johnny Chadda, AGPL-3.0; its source ships as `drexman/source.tar.gz`)
- `/d-rex/` D-Rex: endless runner, Drex Max vs Drex v2.0
- `/stack/` Drex Stack: falling-block puzzle, Drex Max vs Drex v2.0

Add `?clip` to any page for a clean frame to screen-record (no nav, CTA or footnotes).

## Deploy

Vercel: import this repo, framework preset "Other", no build command, output directory `./`. `scripts/` is excluded by `.vercelignore`.

`og:image` points at `https://drex-arcade.vercel.app/og.png`; change it in the four `index.html` files if the site lives on another domain.

## Rebuild Drexman

```bash
scripts/build-drexman.sh /path/to/jevman-fork [recording.json]
```

The fork's `drexman` branch holds the Drex models and the static build switch (`VITE_STATIC=1`).

## Re-record

```bash
node --env-file=/path/to/.env scripts/record.mjs
```

Needs `NACE_API_KEY` in that env file.
