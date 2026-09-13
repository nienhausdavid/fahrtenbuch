app_name = "fahrtenbuch"
app_title = "Fahrtenbuch"
app_publisher = "Dein Name"
app_description = "Fahrten zum Kunden dokumentieren, Kilometerstand per Foto erkennen und optional automatisch abrechnen"
app_email = "info@example.com"
app_license = "mit"

required_apps = ["frappe/erpnext"]

# ---------------------------------------------------------------------------
# Eigene App im Desk (Apps-Uebersicht + Logo oben links innerhalb der App)
# ---------------------------------------------------------------------------
app_logo_url = "/assets/fahrtenbuch/images/fahrtenbuch-logo.svg"

add_to_apps_screen = [
	{
		"name": "fahrtenbuch",
		"logo": "/assets/fahrtenbuch/images/fahrtenbuch-logo.svg",
		"title": "Fahrtenbuch",
		"route": "/app/fahrt",
		"has_permission": "fahrtenbuch.fahrtenbuch.fahrtenbuch.check_app_permission",
	}
]

# ---------------------------------------------------------------------------
# Formular-Skript
#
# Als Datei ausgeliefert statt als Client-Script-Datensatz - verschwindet
# restlos mit der App, ist versionierbar, unterliegt nicht dem
# Client-Script-Cache im Browser (siehe zeit_projekt/README.md "Aufbau").
# ---------------------------------------------------------------------------
doctype_js = {
	"Fahrt": "public/js/fahrtenbuch.js",
	"Fahrtenbuch Einstellungen": "public/js/fahrtenbuch_einstellungen.js",
}

# ---------------------------------------------------------------------------
# Abrechnung aus der Fahrt
#
# Laeuft serverseitig, innerhalb derselben Transaktion wie das Buchen selbst
# (kein separater Request davor). Verhindert den "has been modified after you
# have opened it"-Konflikt, der bei einem eigenen frappe.call vor dem
# Buchen-Request auftreten kann (siehe zeit_projekt.zeit_projekt.sales_order
# bzw. site_visit.site_visit.site_visit fuer den Hintergrund - dort produktiv
# aufgetreten und dadurch behoben).
# ---------------------------------------------------------------------------
doc_events = {
	"Fahrt": {
		"before_submit": "fahrtenbuch.fahrtenbuch.fahrtenbuch.before_submit",
	},
}

# Kein after_install/before_uninstall: keine Custom Fields auf Kern-Doctypes,
# keine sonstigen Datensaetze, die manuell aufgeraeumt werden muessten. Alles
# Neue gehoert zum Modul "Fahrtenbuch" und wird von uninstall-app dadurch
# bereits vollstaendig entfernt.
