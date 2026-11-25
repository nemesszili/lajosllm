# lajosllm — Chrome built-in AI + Firebase demo

A local, single-page demo that follows [Chrome's built-in AI getting started guide](https://developer.chrome.com/docs/ai/get-started).
Ask a question in plain English and Chrome's on-device **Prompt API** turns it into a constrained
query plan. The page then runs a real read-only query against a **Firebase Firestore emulator**
running in its own Docker container and asks the local model to phrase the answer.

Example: *"How many orders did we have in the past 24 hours?"*

```text
Your question
   │
   ▼
Gemini Nano (Chrome Prompt API) ── JSON Schema ──▶ query plan
                                                    │
                                                    ▼
                                     Firestore emulator (Docker, :8080)
                                                    │
                                                    ▼
                                     matching documents + computed summary
                                                    │
                                                    ▼
                                     Gemini Nano writes the final answer
```

## Prerequisites

- **Desktop Chrome** with the Prompt API available. On the web this shipped in Chrome 148+ (it has
  been available in Chrome Extensions since 138); check `chrome://on-device-internals` if the status
  badge says the model is unavailable. The device needs
  the [hardware requirements](https://developer.chrome.com/docs/ai/get-started#required_hardware)
  (macOS 13+, Windows 10/11, Linux or Chromebook Plus; ~22 GB free disk; 16 GB RAM / 4 cores or
  >4 GB VRAM). The first question downloads the model.
- **Docker** with Compose v2.
- Network access on first run (for the Gemini Nano model, the Firebase CLI and the Firebase JS SDK).

## Run it

```bash
docker compose up --build
```

Then open **http://localhost:3000** in Chrome. The **Model download** panel shows availability and a
live progress bar. Click **Prepare model** on first use to start the download, wait for the badges to
turn green (`Chrome AI: ready`, `Firebase Emulator · 85 orders`), then ask a question.

| Service      | URL                     | Purpose                                   |
| ------------ | ----------------------- | ----------------------------------------- |
| `web`        | http://localhost:3000   | Single-page demo (nginx, static files)    |
| `firebase`   | http://localhost:8080   | Firestore emulator for project `demo-lajosllm` |
| Emulator UI  | http://localhost:8081   | Browse the seeded `orders` collection     |
| `seed`       | one-shot container      | Writes 85 deterministic demo orders       |

The seed job waits for the emulator health check, so `docker compose up` is enough — no manual
seeding step. The **Reset demo data** button in the page regenerates the orders relative to *now*
(handy if you come back the next day). You can also run `docker compose run --rm seed` again.

Stop everything with:

```bash
docker compose down
```

## Things to try

- How many orders did we have in the past 24 hours?
- What was our revenue last week?
- Show me the 5 most recent pending orders
- How many cancelled orders were there today?
- Break down orders by status over the last 3 days

The page shows three things for every question: the natural-language answer, the JSON query plan the
model produced under a JSON Schema, and the Firestore query that was actually executed.

## Supported operations (deliberate allowlist)

The model may only choose from these read-only operations:

| Operation             | Meaning                                                        |
| --------------------- | -------------------------------------------------------------- |
| `count_orders`        | Count matching orders                                          |
| `sum_revenue`         | Sum `amount`, excluding `cancelled` unless explicitly requested |
| `average_order_value` | Average `amount`, with the same cancelled-order rule           |
| `list_orders`         | Return the N most recent matching orders (1–25)                |
| `count_by_status`     | Group matching orders by status                                |

Filters are limited to a time window (1–168 hours) and one status (`all`, `pending`, `paid`,
`shipped`, `cancelled`). The plan is validated again in JavaScript before anything is sent to
Firestore, so a hallucinated field, operation or filter cannot turn into an arbitrary query. This is
a local demo, but it demonstrates the right pattern for tool-calling with a generative model.

Each `orders` document has: `orderId`, `createdAt` (Firestore `Timestamp`), `status`, `amount`,
`customer` and `items`.

## Project layout

```text
docker-compose.yml          web + firebase + seed services
firebase/
  Dockerfile                node image with firebase-tools
  firebase.json             emulator config (Firestore on 0.0.0.0:8080)
  firestore.rules           open rules, local emulator only
  firestore.indexes.json    status + createdAt composite index
  seed.js                   one-shot REST seeding job
shared/
  seed-data.js              deterministic order generator used by seed.js and the browser
web/
  index.html                the entire single-page app (HTML + CSS + Prompt API + Firebase SDK)
```

## Troubleshooting

- **`Chrome AI: model downloadable/downloading`** — normal on first use. Click **Prepare model** to
  start the download (or just click **Ask**); the progress bar and badge show the percentage from
  Chrome's `downloadprogress` event. Both clicks supply the user activation Chrome requires.
- **Bar stays at 0% / does not move** — the bar animates as soon as a download starts, even if this
  Chrome build reports no exact percentage. Check the **Activity** panel for an error; a common one
  is that `create()` was not called from a click (it must be, while downloading). Also verify:
  Chrome 148+, enough disk and RAM, an unmetered connection, and no errors in
  `chrome://on-device-internals` → **Broker State**. The Web AI Studio extension shows the model
  state in DevTools. Reload the page and click **Prepare model** again after fixing any of these.
- **`Chrome AI: not available in this browser`** — check that you are using desktop Chrome with the
  Prompt API enabled, that the device meets the requirements, and that
  `LanguageModel.availability()` in DevTools returns `available`.
- **`Firebase unreachable`** — make sure `docker compose ps` shows `firebase` healthy and port 8080
  is free. The page connects the Firebase Web SDK to the emulator with
  `connectFirestoreEmulator(db, 'localhost', 8080)`.
- **Wrong counts** — demo timestamps are relative to seeding time. Use **Reset demo data** to
  regenerate them.
- The emulator has deliberately open security rules and a fake API key. Do not reuse this
  configuration outside localhost.
