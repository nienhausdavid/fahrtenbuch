import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, get_datetime, time_diff_in_hours


class Fahrt(Document):
	def validate(self):
		self.pruefe_zeiten_und_kilometerstand()
		self.distance_km = self.end_odometer - self.start_odometer
		self.duration_hours = flt(time_diff_in_hours(self.end_time, self.start_time), 2)

	def pruefe_zeiten_und_kilometerstand(self):
		if get_datetime(self.end_time) <= get_datetime(self.start_time):
			frappe.throw(_("Das Ende muss nach dem Beginn liegen."))
		if self.end_odometer < self.start_odometer:
			frappe.throw(_("Der Kilometerstand am Ende darf nicht kleiner als am Anfang sein."))
