// Ergaenzt das bestehende Projekt-Formular um einen Schnellzugriff, der eine
// neue Fahrt anlegt - optional mit sofort laufendem Timer (start_time = jetzt)
// und optional mit sofort geoeffneter Kamera fuer das Start-Kilometerstand-
// Foto. Beides einzeln umschaltbar in "Fahrtenbuch Einstellungen"
// (auto_start_timer/auto_open_camera), Standard fuer beide: an.
//
// Zwei Wege dorthin, beide ausgeloest von start_fahrt_aus_projekt():
// 1. Eigener Button oben im Formular - frm.page.add_button() statt
//    frm.add_custom_button(), damit er als eigenstaendiger Button sichtbar
//    bleibt statt in der "..."-Sammelablage zu landen (gleiches Muster wie
//    der PDF-Button von pdf_on_submit).
// 2. Die "+"-Verknuepfung bei "Fahrten" unten in den Verknuepfungen -
//    frm.make_methods ist Frappes eigener Erweiterungspunkt dafuer (siehe
//    Form.make_new() im Frappe-Kern): ohne diesen Eintrag wuerde die
//    Verknuepfung nur das Projekt-Feld vorbelegen, keine Startzeit setzen.
frappe.ui.form.on('Project', {
	refresh(frm) {
		if (frm.is_new()) return;

		frm.page.add_button(__('Fahrt mit Timer starten'), () => start_fahrt_aus_projekt(frm));

		frm.make_methods = frm.make_methods || {};
		frm.make_methods['Fahrt'] = () => start_fahrt_aus_projekt(frm);
	},
});

function start_fahrt_aus_projekt(frm) {
	Promise.all([
		frappe.db.get_single_value('Fahrtenbuch Einstellungen', 'auto_start_timer'),
		frappe.db.get_single_value('Fahrtenbuch Einstellungen', 'auto_open_camera'),
	]).then(([auto_start_timer, auto_open_camera]) => {
		const values = { project: frm.doc.name, customer: frm.doc.customer };
		if (auto_start_timer) {
			values.start_time = frappe.datetime.now_datetime();
		}

		// frappe.new_doc navigiert direkt zum vollen Formular (kein Quick-
		// Entry-Popup, das ist bei "Fahrt" nicht aktiviert) und loest sein
		// Promise erst, wenn diese Navigation fertig ist - cur_frm zeigt
		// danach zuverlaessig auf das neue Fahrt-Formular.
		frappe.new_doc('Fahrt', values).then(() => {
			if (!cur_frm || cur_frm.doctype !== 'Fahrt' || !cur_frm.is_new()) return;

			// Sofortiges Speichern, aus demselben Grund wie der Timer im
			// Fahrt-Formular selbst (siehe fahrtenbuch.js): eine neue,
			// ungespeicherte Fahrt existiert nur im Browser und ginge bei
			// einem Reload/Schliessen der Seite verloren.
			const after_create = auto_start_timer ? cur_frm.save() : Promise.resolve();
			after_create.then(() => {
				if (auto_open_camera) {
					capture_photo_for_field(cur_frm, 'start_odometer_photo');
				}
			});
		});
	});
}

function capture_photo_for_field(frm, fieldname) {
	// Nutzt Frappes eigene frappe.ui.Capture-Klasse direkt (dieselbe, die
	// auch der Kamera-Knopf im normalen Anhaenge-Dialog verwendet) statt des
	// vollen Datei-Upload-Dialogs - auf dem Handy oeffnet das sofort die
	// Kamera-App (kein Zwischenschritt), am Desktop den Webcam-Stream direkt.
	// Kein automatischer Fallback ohne Kamera (z. B. Desktop ohne Webcam):
	// frappe.ui.Capture zeigt dann selbst eine Fehlermeldung (options.error).
	const capture = new frappe.ui.Capture({ animate: false, error: true });
	capture.show();
	capture.submit((data_urls) => {
		if (!data_urls || !data_urls.length) return;
		upload_captured_image(frm, fieldname, data_urls[0]);
	});
}

function upload_captured_image(frm, fieldname, data_url) {
	const filename = `kilometerstand_${frappe.datetime
		.now_datetime()
		.replace(/[: -]/g, '_')}.jpg`;

	fetch(data_url)
		.then((res) => res.blob())
		.then((blob) => {
			const form_data = new FormData();
			form_data.append('file', blob, filename);
			form_data.append('is_private', 1);
			form_data.append('folder', 'Home');
			form_data.append('doctype', frm.doctype);
			if (!frm.is_new()) {
				form_data.append('docname', frm.doc.name);
			}
			form_data.append('fieldname', fieldname);

			return fetch('/api/method/upload_file', {
				method: 'POST',
				headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token },
				body: form_data,
			});
		})
		.then((response) => response.json())
		.then((result) => {
			if (result && result.message && result.message.file_url) {
				frm.set_value(fieldname, result.message.file_url);
			}
		})
		.catch(() => {
			frappe.show_alert({
				message: __('Foto konnte nicht hochgeladen werden.'),
				indicator: 'red',
			});
		});
}
