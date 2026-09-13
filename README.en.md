# Fahrtenbuch (Driving Log)

*[Auf Deutsch lesen](README.md)*

Frappe app for ERPNext v15/v16: document trips to customers, capture the
odometer reading via photo recognition, and optionally bill it automatically.

A technician logs one **Trip** per drive: time period, start/destination,
photos of the odometer at the start and end. The odometer reading is
suggested automatically via AI image recognition (see "Odometer Recognition"
below), but can always be entered or corrected by hand. On submit, travel
time is always added to a sales order, distance driven optionally.

Not a tax-compliant German "Fahrtenbuch": no business/private classification,
no gapless record-keeping requirement. A practical log for customer visits.

---

## Structure

```
fahrtenbuch/
├── pyproject.toml
├── license.txt
├── README.md
├── README.en.md
└── fahrtenbuch/
    ├── __init__.py              # version number
    ├── hooks.py                 # doctype_js + doc_events
    ├── modules.txt              # "Fahrtenbuch"
    ├── patches.txt
    ├── public/
    │   ├── js/fahrtenbuch.js        # field defaults, Site Visit lookup, OCR trigger
    │   └── images/fahrtenbuch-logo.svg
    ├── translations/
    │   └── en.csv                # English translation (app level, not inside the module folder!)
    └── fahrtenbuch/               # module folder
        ├── fahrtenbuch.py         # before_submit (billing) / get_odometer_reading / check_app_permission
        ├── ocr.py                 # reads the odometer via an Ollama vision model
        └── doctype/
            └── fahrt/
                ├── fahrt.json       # main doctype "Fahrt" ("Trip"), submittable
                └── fahrt.py         # controller (validates times/odometer, computes distance/duration)
```

No `install.py`: there are no custom fields on core doctypes and no other
records that would need manual cleanup — everything belongs to the
"Fahrtenbuch" module and is therefore already fully removed by
`uninstall-app`.

The form script ships as a **file**, not a Client Script record. It
disappears completely with the app and isn't subject to the browser's
Client Script cache.

## Language

The app is written in German (field labels, messages) and ships an English
translation (`fahrtenbuch/translations/en.csv`). Same standard Frappe
mechanism as the sister app
[`site_visit`](https://github.com/nienhausdavid/site_visit), just in the
opposite direction (there: English is the source, German the translation):
here the German text in the code/doctype JSON stays the source, and the CSV
file translates it for users whose language is set to English. Frappe picks
the right language automatically per user.

Terms already translated by Frappe/ERPNext itself (e.g. "Customer",
"Employee", "Vehicle", "Sales Order", "Item") are deliberately **not**
duplicated in `en.csv` — only this app's own terms and messages are
translated.

After changing any text in the code: add the new/changed string to `en.csv`
too, otherwise it stays untranslated in English (German as the fallback).

---

## Odometer Recognition

The app reads the odometer value from a dashboard photo via an AI vision
model (`fahrtenbuch/ocr.py`) — configured by default for
[Ollama](https://ollama.com/), reachable over a private network address (e.g.
via [NetBird](https://netbird.io/) or another VPN mesh). The model itself
does **not** run on the ERPNext server, but on any other device on the same
network (tested with a Steam Deck).

Configuration via `site_config.json` (both optional, with defaults):

```json
{
  "fahrtenbuch_ollama_url": "http://<ollama-server-ip>:11434",
  "fahrtenbuch_ollama_model": "qwen3.5:9b"
}
```

If the model is unreachable or doesn't recognize anything clearly, the
odometer field simply stays empty/unchanged — the trip can always be filled
in and submitted by hand; recognition is a pure convenience feature.

`ocr.py` is deliberately its own small module: if a different model,
provider, or a classic OCR engine (e.g. Tesseract) should be used later, only
this one function needs to change.

---

## Before Installing

Fill in name, email, and description in `pyproject.toml` and
`fahrtenbuch/hooks.py`. To rename the app, keep the name consistent across
four places: folder name, package folder, `app_name` in `hooks.py`, and
`name` in `pyproject.toml`.

---

## Installation (own bench)

```bash
cd ~/frappe-bench
bench get-app https://github.com/<your-user>/fahrtenbuch.git
bench --site <your-site> install-app fahrtenbuch
bench build --app fahrtenbuch
bench --site <your-site> clear-cache
```

## Installation (Frappe Cloud)

Custom apps need a Git repository and a dedicated bench group there (not
possible on the small shared plans).

1. Create a repository on GitHub and upload this folder's contents
2. In Frappe Cloud: Bench group → *Apps* → *Add App* → *From GitHub*
3. Trigger a deploy, then install the app on the site

---

## Uninstalling

```bash
bench --site <your-site> uninstall-app fahrtenbuch --dry-run   # preview only
bench --site <your-site> uninstall-app fahrtenbuch
```

**What gets removed:**

- the "Fahrt" doctype
- the "Fahrtenbuch" module and everything attached to it
- the form script, since it's pure code

**What's deliberately kept:**

- already-submitted trips
- line items already added to sales orders (the order's own line items don't
  belong to this app)

---

## Setup

- Billing needs an item for travel time (required) and optionally an item
  for mileage reimbursement — both with a sensible price/rate configured.
- If the sister app [`site_visit`](https://github.com/nienhausdavid/site_visit)
  is also installed on the same site, a trip can optionally be linked to a
  site visit — customer, project, and sales order are then filled in
  automatically. Loose coupling via the "Site Visit" doctype, no hard
  dependency.

## Own App in the Desk

The app ships its own logo (`public/images/fahrtenbuch-logo.svg`) and
registers itself via `add_to_apps_screen`/`app_logo_url` in `hooks.py` as its
own tile on the Apps overview (`/apps`), jumping straight into the Trip list
(no separate workspace page in between).

## Permissions

| Role | Read | Write | Create | Submit | Cancel |
|---|---|---|---|---|---|
| System Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Projects Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Employee | own | own | ✓ | own | – |
| Projects User | ✓ | – | – | – | – |
| Accounts User | ✓ | – | – | – | – |

There's deliberately no dedicated, narrower technician role shipped as a
fixture (roles aren't module-bound and would be left behind as an orphan on
uninstall); anyone who wants tighter access than the standard "Employee" role
should create their own role manually.

---

## Ideas for Extension

- A **"New Sales Order" dialog** directly from the trip (like in
  `site_visit`), instead of only being able to pick an existing order.
- **GPS/address-based automatic distance calculation** (e.g. Google Maps
  Distance Matrix) as an alternative/addition to the odometer photo.
- **Combining several trips per day** instead of submitting one at a time.
