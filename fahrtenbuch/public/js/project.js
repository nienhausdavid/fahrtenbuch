// Ergaenzt das bestehende Projekt-Formular um einen Schnellzugriff, der eine
// neue Fahrt mit bereits laufendem Timer anlegt (start_time = jetzt) - die
// normale "+"-Verknuepfung unten bei "Fahrten" legt dagegen eine leere Fahrt
// ohne gestarteten Timer an.
frappe.ui.form.on('Project', {
	refresh(frm) {
		if (frm.is_new()) return;
		frm.add_custom_button(__('Fahrt mit Timer starten'), () => {
			frappe.new_doc('Fahrt', {
				project: frm.doc.name,
				customer: frm.doc.customer,
				start_time: frappe.datetime.now_datetime(),
			});
		});
	},
});
