# Fog of Conquest

This is a small browser strategy game. Interface texts are available in Russian, English and now Ukrainian.
See [CONTRIBUTING.md](CONTRIBUTING.md) for translation guidelines.

Run `npm install` to install development dependencies and `npm test` to execute unit tests.

## Running the game locally

The game is fully client side. Any static HTTP server can be used to serve the
files. With Node.js (>=18 recommended) installed you can run:

```bash
npx http-server -c-1
```

and then open `http://localhost:8080` in your browser.

If you prefer a different tool simply point it at the repository root.

After winning a match you can watch a replay. Use the slider to seek to any
moment, restart the replay or change playback speed. A "Save video" button lets
you export the replay as a WebM file. Replay controls can now be collapsed into
a single icon with a dedicated pause/play button for compact viewing.
