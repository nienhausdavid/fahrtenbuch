// Abrechnung passiert serverseitig beim Buchen (siehe hooks.py -> doc_events
// -> fahrtenbuch.fahrtenbuch.fahrtenbuch.before_submit). Dieses Skript setzt
// nur Feld-Defaults, uebernimmt Werte aus einer verknuepften Site Visit und
// stoesst die Kilometerstand-Erkennung nach einem Foto-Upload an - keine
// async Calls vor dem Buchen, um die Race Condition aus
// zeit_projekt/sales_order.js nicht zu wiederholen.

frappe.ui.form.on('Fahrt', {
	onload(frm) {
		if (!frm.is_new()) return;
		if (!frm.doc.employee) {
			frappe.db.get_value('Employee', { user_id: frappe.session.user, status: 'Active' }, 'name')
				.then((r) => {
					if (r.message && r.message.name) frm.set_value('employee', r.message.name);
				});
		}
		if (!frm.doc.start_time) frm.set_value('start_time', frappe.datetime.now_datetime());
	},

	site_visit(frm) {
		if (!frm.doc.site_visit) return;
		frappe.db.get_value('Site Visit', frm.doc.site_visit, ['customer', 'project', 'sales_order'])
			.then((r) => {
				if (!r.message) return;
				if (r.message.customer && !frm.doc.customer) frm.set_value('customer', r.message.customer);
				if (r.message.project && !frm.doc.project) frm.set_value('project', r.message.project);
				if (r.message.sales_order && !frm.doc.sales_order) {
					frm.set_value('sales_order', r.message.sales_order);
				}
			});
	},

	start_odometer_photo(frm) {
		fetch_odometer_reading(frm, 'start_odometer_photo', 'start_odometer');
	},

	end_odometer_photo(frm) {
		fetch_odometer_reading(frm, 'end_odometer_photo', 'end_odometer');
	},

	refresh(frm) {
		frm.dashboard.clear_headline();
		if (frm.doc.start_odometer && frm.doc.end_odometer && frm.doc.distance_km) {
			frm.dashboard.set_headline_alert(
				__('Strecke: {0} km, Dauer: {1} Std.', [frm.doc.distance_km, frm.doc.duration_hours]),
				'blue'
			);
		}
	},
});

function fetch_odometer_reading(frm, photo_field, odometer_field) {
	const file_url = frm.doc[photo_field];
	if (!file_url) return;

	frappe.call({
		method: 'fahrtenbuch.fahrtenbuch.fahrtenbuch.get_odometer_reading',
		args: { file_url },
		freeze: true,
		freeze_message: __('Kilometerstand wird erkannt...'),
		callback(r) {
			if (r.message) {
				frm.set_value(odometer_field, r.message);
				frappe.show_alert({ message: __('Kilometerstand erkannt: {0}', [r.message]), indicator: 'green' });
			} else {
				frappe.show_alert({
					message: __('Konnte den Kilometerstand nicht erkennen, bitte manuell eintragen.'),
					indicator: 'orange',
				});
			}
		},
	});
}
