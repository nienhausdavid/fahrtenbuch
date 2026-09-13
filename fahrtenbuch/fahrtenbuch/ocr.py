import base64
import re

import frappe
import requests

DEFAULT_OLLAMA_URL = "http://100.77.112.115:11434"
DEFAULT_OLLAMA_MODEL = "qwen3.5:9b"

PROMPT = (
	"This is a photo of a car odometer (mileage display). What is the total "
	"number of kilometers shown? Ignore any small decimal/tenths digit shown "
	"in a different color. Respond with only the digits, nothing else."
)


def read_odometer(file_url: str) -> int | None:
	"""Liest den Kilometerstand per Ollama-Vision-Modell (laeuft auf dem
	Steam Deck des Nutzers, per NetBird erreichbar - siehe README.md).

	None bei Fehler oder wenn nichts Eindeutiges erkannt wurde - der
	Techniker traegt dann manuell ein, das Feld bleibt dafuer immer normal
	editierbar. Bewusst in einem eigenen Modul: die einzige Stelle, die sich
	aendern muesste, falls Modell/URL/Anbieter spaeter wechseln."""
	file_doc = frappe.get_doc("File", {"file_url": file_url})
	with open(file_doc.get_full_path(), "rb") as f:
		image_b64 = base64.b64encode(f.read()).decode()

	url = frappe.conf.get("fahrtenbuch_ollama_url", DEFAULT_OLLAMA_URL)
	model = frappe.conf.get("fahrtenbuch_ollama_model", DEFAULT_OLLAMA_MODEL)

	try:
		response = requests.post(
			f"{url}/api/generate",
			json={
				"model": model,
				"prompt": PROMPT,
				"images": [image_b64],
				"stream": False,
				"think": False,
			},
			# Grosszuegig: ein kaltes Modell (noch nicht im Ollama-Speicher)
			# brauchte im Test ca. 10-15s zusaetzlich zur eigentlichen Anfrage.
			timeout=30,
		)
		response.raise_for_status()
		text = response.json().get("response", "")
	except requests.RequestException:
		frappe.logger("fahrtenbuch").error("Ollama-OCR nicht erreichbar", exc_info=True)
		return None

	digits = re.sub(r"\D", "", text)
	return int(digits) if digits else None
