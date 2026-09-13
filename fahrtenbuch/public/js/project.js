// Ergaenzt das bestehende Projekt-Formular um einen Schnellzugriff, der eine
// neue Fahrt mit bereits laufendem Timer anlegt (start_time = jetzt). Zwei
// Wege dorthin, beide ausgeloest von start_fahrt_mit_timer():
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

		frm.page.add_button(__('Fahrt mit Timer starten'), () => start_fahrt_mit_timer(frm));

		frm.make_methods = frm.make_methods || {};
		frm.make_methods['Fahrt'] = () => start_fahrt_mit_timer(frm);
	},
});

function start_fahrt_mit_timer(frm) {
	frappe.new_doc('Fahrt', {
		project: frm.doc.name,
		customer: frm.doc.customer,
		start_time: frappe.datetime.now_datetime(),
	});
}
