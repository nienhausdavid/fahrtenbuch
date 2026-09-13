# Fahrtenbuch

*[Read this in English](README.en.md)*

Frappe-App für ERPNext v15/v16: Fahrten zum Kunden dokumentieren, Kilometerstand
per Fotoerkennung erfassen und optional automatisch abrechnen.

Ein Techniker legt pro Fahrt eine **Fahrt** an: Zeitraum, Start/Ziel, Fotos vom
Tacho am Anfang und am Ende. Der Kilometerstand wird dabei per KI-Bilderkennung
automatisch vorgeschlagen (siehe "Kilometerstand-Erkennung" unten), lässt sich
aber jederzeit von Hand eintragen oder korrigieren. Beim Buchen wird die
Fahrzeit immer, die gefahrene Strecke optional als Position in einen Auftrag
übernommen.

Kein Finanzamt-taugliches Fahrtenbuch: keine Geschäftlich/Privat-Kennzeichnung,
keine lückenlose Erfassung. Ein praktisches Log für Kundenbesuche.

---

## Aufbau

```
fahrtenbuch/
├── pyproject.toml
├── license.txt
├── README.md
├── README.en.md
└── fahrtenbuch/
    ├── __init__.py              # Versionsnummer
    ├── hooks.py                 # doctype_js + doc_events
    ├── modules.txt              # "Fahrtenbuch"
    ├── patches.txt
    ├── public/
    │   ├── js/fahrtenbuch.js        # Feld-Defaults, Site-Visit-Uebernahme, OCR-Trigger
    │   ├── js/fahrtenbuch_einstellungen.js  # "Modelle abrufen"-Button
    │   ├── js/project.js            # "Fahrt mit Timer starten"-Button auf dem Projekt-Formular
    │   └── images/fahrtenbuch-logo.svg
    ├── translations/
    │   └── en.csv                # Englische Uebersetzung (App-Ebene, nicht im Modulordner!)
    └── fahrtenbuch/               # Modulordner
        ├── fahrtenbuch.py         # before_submit (Abrechnung) / get_odometer_reading / check_app_permission
        ├── ocr.py                 # Kilometerstand per OpenAI-kompatibler Vision-API erkennen
        ├── project_dashboard.py   # ergaenzt "Fahrten" in den Projekt-Verknuepfungen
        └── doctype/
            ├── fahrt/
            │   ├── fahrt.json       # Haupt-Doctype, submittable
            │   └── fahrt.py         # Controller (Zeiten/Kilometerstand pruefen, Distanz/Dauer berechnen)
            └── fahrtenbuch_einstellungen/
                └── fahrtenbuch_einstellungen.json   # Single-Doctype: API-URL/Modell/Schluessel
```

Kein `install.py`: Es gibt keine Custom Fields auf Kern-Doctypes und keine
sonstigen Datensätze, die manuell aufgeräumt werden müssten — alles gehört
zum Modul "Fahrtenbuch" und wird von `uninstall-app` dadurch bereits
vollständig entfernt.

Das Formular-Skript ist eine **Datei**, kein Client-Script-Datensatz. Es
verschwindet restlos mit der App und unterliegt nicht dem
Client-Script-Cache im Browser.

## Sprache

Die App ist auf Deutsch geschrieben (Feldbezeichnungen, Meldungen) und liefert
eine englische Übersetzung mit (`fahrtenbuch/translations/en.csv`). Das ist
das normale Frappe-Verfahren, nur in umgekehrter Richtung wie bei der
Schwester-App [`site_visit`](https://github.com/nienhausdavid/site_visit)
(dort Englisch als Quelle, Deutsch als Übersetzung): der deutsche Text im
Code/in der Doctype-JSON bleibt hier die Quelle, die CSV-Datei übersetzt für
Nutzer mit Sprache "Englisch". Frappe wählt die Sprache automatisch passend
zum jeweiligen Nutzer.

Standardbegriffe, die bereits über Frappe/ERPNext selbst übersetzt sind
(z. B. "Customer", "Employee", "Vehicle", "Sales Order", "Item"), sind
bewusst **nicht** nochmal in `en.csv` enthalten. Übersetzt sind nur die für
diese App eigenen Begriffe und Texte.

Nach Änderungen an Texten im Code: neue/geänderte Strings auch in `en.csv`
ergänzen, sonst bleiben sie auf Englisch unübersetzt (Deutsch als Fallback).

---

## Kilometerstand-Erkennung

Die App liest den Kilometerstand aus einem Tacho-Foto über eine beliebige
**OpenAI-kompatible API** aus (`fahrtenbuch/ocr.py`, Chat-Completions-Format
mit Bild) — funktioniert damit z. B. mit [Ollama](https://ollama.com/) (eigener
Server, eigenes Netz, z. B. per [NetBird](https://netbird.io/) erreichbar,
getestet mit einem Steam Deck als Host), LM Studio, oder echtem OpenAI.

**Einrichtung:** Doctype **"Fahrtenbuch Einstellungen"** öffnen (Suche im
Awesomebar) und ausfüllen:

- **API-URL**: Basis-URL ohne `/chat/completions` am Ende, z. B.
  `http://<ip-des-servers>:11434/v1` für Ollama oder `https://api.openai.com/v1`
- **Modell**: z. B. `qwen3.5:9b` — Button **"Verfügbare Modelle abrufen"**
  fragt die eingetragene API direkt nach den dort tatsächlich vorhandenen
  Modellen (`GET .../models`, Teil des OpenAI-Standards) und zeigt sie zur
  Auswahl an, testet dabei auch eine gerade eingetippte, noch nicht
  gespeicherte API-URL
- **API-Schlüssel**: nur nötig, falls die API einen verlangt (bei den meisten
  lokal/selbst gehosteten Servern leer lassen)
- **Artikel Fahrzeit**: Vorbelegung für das gleichnamige Pflichtfeld auf einer
  neuen Fahrt — bleibt dort weiterhin pro Fahrt änderbar

**Keine Standardwerte hinterlegt** — ohne Eintrag bleibt die automatische
Erkennung schlicht deaktiviert. Ist die API nicht erreichbar/nicht
konfiguriert oder erkennt nichts Eindeutiges, bleibt das Kilometerstand-Feld
einfach leer bzw. unverändert — die Fahrt lässt sich immer ganz normal von
Hand ausfüllen und buchen, die Erkennung ist reine Komfortfunktion.

`ocr.py` ist bewusst ein eigenes, kleines Modul: falls das API-Format später
wechseln sollte, muss nur diese eine Funktion angepasst werden.

---

## Vor der Installation anpassen

In `pyproject.toml` und `fahrtenbuch/hooks.py` Name, E-Mail und Beschreibung
eintragen. Willst du die App anders nennen, muss der Name an vier Stellen
konsistent sein: Ordnername, Paketordner, `app_name` in `hooks.py` und `name`
in `pyproject.toml`.

---

## Installation (eigener Bench)

```bash
cd ~/frappe-bench
bench get-app https://github.com/<dein-user>/fahrtenbuch.git
bench --site <deine-site> install-app fahrtenbuch
bench build --app fahrtenbuch
bench --site <deine-site> clear-cache
```

## Installation (Frappe Cloud)

Eigene Apps brauchen dort ein Git-Repository und eine eigene Bench-Gruppe
(auf den kleinen Shared-Plänen nicht möglich).

1. Repository auf GitHub anlegen und den Inhalt dieses Ordners hochladen
2. In Frappe Cloud: Bench-Gruppe → *Apps* → *Add App* → *From GitHub*
3. Deploy anstoßen, danach die App auf der Site installieren

---

## Deinstallation

```bash
bench --site <deine-site> uninstall-app fahrtenbuch --dry-run   # nur anzeigen
bench --site <deine-site> uninstall-app fahrtenbuch
```

**Was dabei entfernt wird:**

- die Doctype "Fahrt"
- das Modul „Fahrtenbuch" und alles, was daran hängt
- das Formular-Skript, da es reiner Code ist

**Was bewusst bestehen bleibt:**

- bereits gebuchte Fahrten
- bereits in Aufträge übernommene Positionen (die Auftragspositionen selbst
  gehören nicht zu dieser App)

---

## Einrichtung

- Für die Abrechnung werden ein Artikel für die Fahrzeit (Pflicht) und optional
  ein Artikel für Kilometergeld benötigt — beide mit sinnvoll hinterlegtem
  Preis/Satz.
- Ist auf derselben Site zusätzlich die Schwester-App
  [`site_visit`](https://github.com/nienhausdavid/site_visit) installiert,
  lässt sich eine Fahrt optional mit einem Kundeneinsatz verknüpfen — Kunde,
  Projekt und Auftrag werden dann automatisch übernommen. Lose Kopplung über
  die Doctype "Site Visit", keine harte Abhängigkeit.
- Im Projekt-Formular gibt es unter "Verknüpfungen" jetzt eine Gruppe
  "Fahrten" (additiv über `override_doctype_dashboards`, ergänzt die
  bestehende Liste statt sie zu ersetzen). Zusätzlich ein eigener Button
  **"Fahrt mit Timer starten"** oben im Projekt-Formular — legt direkt eine
  neue Fahrt mit bereits laufendem Timer an (Projekt/Kunde vorbelegt), anders
  als die normale "+"-Verknüpfung, die eine leere Fahrt ohne gestarteten
  Timer anlegt.

## Eigene App im Desk

Die App bringt ein eigenes Logo mit (`public/images/fahrtenbuch-logo.svg`) und
registriert sich über `add_to_apps_screen`/`app_logo_url` in `hooks.py` als
eigene Kachel auf der Apps-Übersicht (`/apps`), mit direktem Sprung in die
Fahrt-Liste (keine eigene Workspace-Seite dazwischen).

## Berechtigungen

| Rolle | Lesen | Schreiben | Anlegen | Buchen | Stornieren |
|---|---|---|---|---|---|
| System Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Projects Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Employee | eigene | eigene | ✓ | eigene | – |
| Projects User | ✓ | – | – | – | – |
| Accounts User | ✓ | – | – | – | – |

Es gibt bewusst keine eigene, engere Techniker-Rolle als Fixture (Rollen sind
nicht modulgebunden und würden beim Deinstallieren als Karteileiche
zurückbleiben); wer den Zugriff über die Standardrolle "Employee" hinaus
einschränken will, legt manuell eine eigene Rolle an.

---

## Erweiterungsideen

- **"Neuer Auftrag"-Dialog** direkt aus der Fahrt heraus (wie in `site_visit`),
  statt nur einen bestehenden Auftrag wählen zu können.
- **GPS/Adress-basierte automatische km-Berechnung** (z. B. Google Maps
  Distance Matrix) als Alternative/Ergänzung zum Kilometerstand-Foto.
- **Mehrere Fahrten pro Tag zusammenfassen** statt Einzelbuchung je Fahrt.
