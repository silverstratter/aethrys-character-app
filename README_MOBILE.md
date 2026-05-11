# Aethrys Mobile Player App

This is a mobile-first, player-facing version of the Aethrys canon registry. It loads only player-safe JSON files.

Records included:

- Characters: 189
- Relationships: 474
- Houses/families: 26
- Factions: 9
- Regions: 6

## Run locally

Because the app loads JSON with `fetch()`, do not open `index.html` directly from the file system. Run a tiny local server inside this folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Install on iPhone or iPad

1. Start the local server or upload the folder to a simple web host.
2. Open the app URL in Safari.
3. Tap the Share button.
4. Tap **Add to Home Screen**.
5. Name it **Aethrys Canon** and add it.

## Install on Android

1. Start the local server or upload the folder to a simple web host.
2. Open the app URL in Chrome.
3. Tap the browser menu.
4. Tap **Install app** or **Add to Home screen**.

## Update data

Edit these files, then refresh the app:

- `characters_player.json`
- `relationships_player.json`
- `houses.json`
- `factions.json`
- `regions.json`

If installed as a PWA and old data appears, close the app fully and reopen it. If needed, clear site storage in the browser.

## Spoiler safety

This folder intentionally does not include `characters_dm.json` or `relationships_dm.json`.
