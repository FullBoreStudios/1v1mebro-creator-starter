# Stamp Sprint · 1v1meBro Creator Starter

A complete little browser game you can fork and submit to the [1v1meBro Creator Portal](https://onevonemebro.com/creators/). It includes playable source, original canvas art, repeatable gameplay checks, an MIT license, and the root submission manifest.

**Play:** parcels arrive on a toy conveyor. When the front parcel reaches the striped stamp zone, tap its matching circle, triangle, or square. A correct stamp earns 10 points plus a streak bonus, capped at 10 extra points. Wrong or missed parcels reset the streak. The shift ends after 45 seconds. Symbols carry the information, so color is optional.

Keyboard: **1 / 2 / 3** or **A / S / D**. **P** pauses. **Enter** starts another shift. Phone and tablet: tap the three stamp buttons. Switching tabs pauses the game.

## Run it locally

```powershell
git clone https://github.com/FullBoreStudios/1v1mebro-creator-starter.git
cd 1v1mebro-creator-starter
py -m http.server 8080
```

Open **http://127.0.0.1:8080/game/**. On macOS/Linux, use `python3 -m http.server 8080`. There is no dependency installation or build step. `game/` is the committed release directory; any static HTTP server can serve it.

Change the seed field between shifts, or open `/game/?seed=123`. Seeds range from 0 through 2147483647. The default is 314159. A seed always generates the same parcel sequence and timing, independent of player input, display size, or decorative motion.

## Test it

With Node.js 18 or newer:

```powershell
node tests/check.cjs
```

The checks cover repeatable courses and results, frame-rate parity, timer boundaries, scoring, ignored early taps, missed parcels, invalid seeds, input-independent randomness, classic-script loading, and the committed release files. No test dependency installation is required.

Before submitting your fork, open it in a browser and check:

- Touch buttons on a narrow phone viewport and keyboard controls on desktop.
- No horizontal scroll; readable score, time, instructions, and symbols.
- The system's reduced-motion setting and the in-game **Motion reduced** button. Conveyor and celebration motion stop; the required parcel movement remains.
- Pause/resume and switching tabs. The timer does not run while paused.
- A complete shift, a wrong stamp, and a missed parcel.
- Browser developer tools show no network requests except local release files, and no console errors.
- A sandboxed iframe using only `allow-scripts` can load and play the committed release.

## Make it yours

1. Fork this repository and change the game, its title, and its instructions.
2. Edit **`1v1mebro.json` at the repository root**. Put your own author name and GitHub username in it.
3. Keep a supported open-source license in the root `LICENSE`. Check every asset's separate license. Only affirm rights and hosting/modification permission when you can grant them.
4. Keep all playable files in `game/`, or change `game.build_directory` to your committed static output directory. `game.entrypoint` is relative to that directory.
5. Commit your source, the manifest, `LICENSE`, and the complete playable output. Run your checks, then push the public repository.
6. Sign in at [onevonemebro.com](https://onevonemebro.com/beta/login/) and submit your repository URL at [Creator Portal → Submit](https://onevonemebro.com/creators/submit/).

The manifest's exact format and the POST example are in [SUBMISSION.md](SUBMISSION.md). This sample attributes its original art and code to FullBoreStudios. A fork must accurately describe any assets it adds; the starter's declarations do not automatically cover new files.

## How the game is built

| File | Purpose |
| --- | --- |
| `1v1mebro.json` | Author, license, rights, permissions, release path, controls, build/play/test notes |
| `game/index.html` | Accessible page and touch controls |
| `game/engine.js` | Pure 60 Hz seeded simulation and integer scoring |
| `game/app.js` | Canvas illustrations, keyboard/touch input, pause and reduced motion |
| `game/style.css` | Responsive orange, ivory, and ink interface |
| `game/LICENSE.txt` | Complete MIT notice retained in the hosted static package |
| `tests/check.cjs` | Dependency-free deterministic checks |
| `LICENSE` | MIT license for source and original art |

The engine uses the public 1v1meBro randomness algorithm, FNV-1a + Mulberry32, with named/indexed streams. It generates each parcel from `seed`, game key, rules version, namespace, and event index. Input never consumes course randomness. The browser advances the simulation at 60 ticks per second and renders separately. All scored state lives in the engine. Pauses and bounded catch-up make this a forgiving solo playtest; it is not an authoritative competitive clock.

The release uses classic scripts and local CSS. It has no external fonts, images, libraries, audio, analytics, storage, accounts, or network calls. That lets the portal rehost it in a restricted iframe without access to account cookies or the host page.

## What submission means

Submitting records a public GitHub URL and reads the manifest and license at a pinned commit. It does not automatically execute, build, publish, or add your game to the Arena. The team checks source safety, asset rights, license compatibility, and minimum requirements. A reviewed static package may then be rehosted on its public Creator Playtest detail page, where signed-in visitors can vote. Popularity helps the team choose games for occasional manual promotion; it does not promise acceptance.

Playtest scores stay inside the game. They do not change 1v1 results, records, streaks, or badges. Integrating a game into the main Arena needs a separate reviewed server/game registration. See the [developer guide](https://onevonemebro.com/developers/) for the existing Arena authoring contract.

All original source, illustrations, styling, and documentation are **MIT licensed**. No third-party artwork is bundled.
