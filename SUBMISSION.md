# Submitting a repository

The repository must be **public on GitHub** and have a root **`1v1mebro.json`**. Submit the root URL, for example `https://github.com/FullBoreStudios/1v1mebro-creator-starter`. File, branch, issue, preview, archive, and non-GitHub URLs are not submissions.

The portal reads the current default-branch commit, its manifest, its license, and its declared HTML entrypoint. It records that exact commit SHA for review. Later pushes do not silently change a submitted revision. Submit the URL again to request review of a new revision.

## Manifest v1

Use this repository's [1v1mebro.json](1v1mebro.json) as the complete example. [1v1mebro.schema.json](1v1mebro.schema.json) is the JSON Schema reference for editors and validation tools. Configure the schema through your editor's settings; **do not add `$schema` to the manifest**, because v1 rejects extra keys.

Only documented keys are allowed. Fields below are required except `game.thumbnail`, which is optional. Strings must be nonempty unless stated below. Newlines, tabs, and carriage returns are allowed; other ASCII control characters are rejected. Paths are relative, use forward slashes, and contain only letters, digits, periods, underscores, and hyphens. No absolute paths, traversal, or dot path segments are allowed. A `build_directory` of `.` is the one exception.

| Field | Required value / limit |
| --- | --- |
| `schema_version` | Integer `1` |
| `title` | Game title, up to 100 characters |
| `description` | Public description, up to 2000 characters |
| `author.name` | Public author or studio, up to 100 characters |
| `author.github_username` | GitHub identity, 1–39 letters/digits/hyphens, starts with letter/digit |
| `license.spdx_id` | `MIT`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `ISC`, or `CC0-1.0` |
| `license.file` | Committed license file path, up to 200 characters; use root `LICENSE` |
| `permissions.hosting_allowed` | Boolean `true`: permission to rehost the game |
| `permissions.modification_allowed` | Boolean `true`: permission to modify/integrate it |
| `assets.rights_confirmed` | Boolean `true`: you own the assets or have sufficient compatible rights |
| `assets.license_notes` | Explain provenance and compatibility, up to 3000 characters |
| `assets.attributions` | Array, at most 100 entries; may be empty for entirely original work described in license notes |
| Each attribution | Exactly `path`, `author`, `license`, `source`; path ≤200, author/license ≤100, HTTPS source ≤500 or empty for original work |
| `game.entrypoint` | Committed HTML file path relative to build directory, up to 200 characters |
| `game.build_directory` | Committed static output directory relative to root, up to 200 characters, or `.` |
| `game.thumbnail` | Optional image path relative to `game.build_directory`, up to 200 characters; PNG, JPG/JPEG, or WebP, at most 1 MiB and 4096 pixels per side |
| `game.controls` | Touch and keyboard instructions, up to 1000 characters |
| `game.player_count` | Integer `1` for current solo playtests |
| `game.seeded` | Boolean `true`: reproducible rules and course |
| `game.reduced_motion` | Boolean `true`: decorative motion respects reduced motion |
| `instructions.build` | Exact build steps or explicit no-build statement, up to 3000 characters |
| `instructions.play` | Local launch command, URL, and rules, up to 3000 characters |
| `instructions.test` | Reproducibility checks and manual checks, up to 3000 characters |
| `comments`, `notes` | Strings up to 3000 each; empty is allowed |

A supported license identifier is an initial review filter. It does not establish that the license file actually grants those rights or that a third-party asset is compatible. Reviewers check both before hosting. Document dependencies, external services, known issues, accessibility limits, and build steps in `notes`.

## Portal thumbnail

Commit your thumbnail in the same static release as your game, then declare its path:

```json
{
  "game": {
    "entrypoint": "index.html",
    "build_directory": "game",
    "thumbnail": "thumbnail.png"
  }
}
```

This excerpt shows the relevant fields; retain the other required `game` fields from the complete manifest. Here the file is `game/thumbnail.png`, not `thumbnail.png` at the repository root. A nested path such as `images/card.webp` is also valid when that file is inside the build directory. External URLs and direct image uploads are not supported.

Use a clear gameplay screenshot or original artwork you have the right to redistribute. A 1280×720 image (16:9) is recommended; there is no minimum size. The actual image must be PNG, JPG/JPEG, or WebP, no larger than 1 MiB or 4096 pixels on either side. Describe its provenance and license in `assets.license_notes` and any applicable attribution.

This example's `game/thumbnail.png` is an unaltered screenshot of actual Stamp Sprint gameplay in Google Chrome with seed `314159`, covered by the game's MIT license. The portal picks up the declared image from the reviewed package when staff installs it, then serves it through the same build route. Omitting the field retains the letter fallback. Declaring an image does not bypass source, rights, or package review, and does not automatically approve or publish a submission.

## Minimum playable package

- One-player browser game with touch and keyboard controls, visible instructions, and a clear completed attempt.
- Seeded course generation and scoring at fixed simulation ticks; input/render effects cannot alter future randomness.
- A responsive layout and reduced decorative motion.
- Complete committed static output, including local scripts, styles, and assets.
- Open source, license text, asset provenance, and explicit hosting/modification permission.
- Build/play/test instructions that a reviewer can follow.
- No secrets, trackers, remote executable dependencies, credential collection, or hidden network behavior.

Current playtests run in a restricted `sandbox="allow-scripts"` iframe without same-origin access. It cannot access the portal account, parent page, storage, network APIs, popups, or forms. Classic local scripts are the simplest option. Do not rely on module imports, fetching assets/data, CDN libraries/fonts, backend services, or service workers. Canvas, local images, local CSS, and classic scripts are sufficient for this example.

## Submit in the portal

Sign in, open [Creator Portal → Submit](https://onevonemebro.com/creators/submit/), paste the root GitHub URL, and submit. No separate metadata form is needed: the manifest is the source of submission data. A pending submission is visible to its submitter and staff. Approval makes a repository entry public; reviewed rehosting makes it playable and opens voting.

## POST a repository URL

The API uses the same logged-in Django session as the website, plus CSRF protection. From a same-origin page on `onevonemebro.com` **while signed in**, this example submits a fork:

```js
const { csrf_token } = await fetch('/api/v1/auth/csrf/', {
  credentials: 'same-origin',
}).then(response => response.json());

const response = await fetch('/api/v1/creators/submissions/', {
  method: 'POST',
  credentials: 'same-origin',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrf_token,
  },
  body: JSON.stringify({
    repository_url: 'https://github.com/YOUR-USERNAME/YOUR-GAME',
  }),
});
const data = await response.json();
if (!response.ok) throw new Error(data.error || 'Submission failed');
console.log(data.submission.id, data.submission.commit_sha, data.submission.detail_url);
```

Replace the example owner/name before running it. The POST body contains **only `repository_url`**. A new revision returns **201** with `{submission}`. Invalid URLs/manifests or duplicate account/repository/commit submissions return **400**. Missing login returns **403**, a repository fetch failure returns **502**, and more than ten submission attempts per day returns **429**. CSRF failure also returns 403. Cross-origin credentialed submission and API tokens are not currently supported.

Read entries using `GET /api/v1/creators/submissions/` or `GET /api/v1/creators/submissions/<uuid>/`. Public visitors receive approved/hosted entries; the submitter also sees their pending revisions, and staff sees the review queue. `?sort=popular` sorts by votes. Public detail and play pages are `/creators/<uuid>/` and `/creators/<uuid>/play/`.

Once a game is hosted, signed-in voters send `POST /api/v1/creators/submissions/<uuid>/vote/` with `{ "voted": true }`, using the same cookies and CSRF header. Send `false` to remove your vote. Each account has one vote per submission; repeated `true` requests do not add votes. Voting never promotes a game automatically.

## Review and promotion

The team reviews the pinned commit's source safety, license, asset rights, and minimum requirements. Approval only lists the repository. A reviewer then checks the actual local static package and manually promotes it to **playtest** or **featured**. Neither submit nor approval runs repository scripts automatically.

Votes help the team choose popular games for occasional promotion. Main Arena integration, competitive validation, game records, and badges are a separate reviewed process. This starter's score is local and does not call player result APIs.
