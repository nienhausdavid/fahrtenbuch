import base64
import re

import frappe
import requests

PROMPT = (
	"This is a photo of a car odometer (mileage display). What is the total "
	"number of kilometers shown? Ignore any small decimal/tenths digit shown "
	"in a different color. Respond with only the digits, nothing else."
)


def read_odometer(file_url: str) -> int | None:
	"""Liest den Kilometerstand ueber eine OpenAI-kompatible Chat-Completions-
	API (Ollama, LM Studio, echtes OpenAI, ...) - konfiguriert in
	"Fahrtenbuch Einstellungen", keine Standard-URL/kein Standard-Modell
	hinterlegt.

	None, wenn nichts konfiguriert ist, die API nicht erreichbar ist oder
	nichts Eindeutiges erkannt wurde - der Techniker traegt dann manuell ein,
	das Feld bleibt dafuer immer normal editierbar. Bewusst in einem eigenen
	Modul: die einzige Stelle, die sich aendern muesste, falls das
	API-Format spaeter wechseln sollte."""
	settings = frappe.get_cached_doc("Fahrtenbuch Einstellungen")
	if not settings.api_url or not settings.model:
		return None

	file_doc = frappe.get_doc("File", {"file_url": file_url})
	with open(file_doc.get_full_path(), "rb") as f:
		image_b64 = base64.b64encode(f.read()).decode()

	headers = {"Content-Type": "application/json"}
	api_key = settings.get_password("api_key", raise_exception=False)
	if api_key:
		headers["Authorization"] = f"Bearer {api_key}"

	try:
		response = requests.post(
			f"{settings.api_url.rstrip('/')}/chat/completions",
			headers=headers,
			json={
				"model": settings.model,
				"messages": [
					{
						"role": "user",
						"content": [
							{"type": "text", "text": PROMPT},
							{
								"type": "image_url",
								"image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
							},
						],
					}
				],
				"stream": False,
			},
			# Grosszuegig: ein kaltes, noch nicht geladenes Modell brauchte im
			# Test 10-15s zusaetzlich zur eigentlichen Anfrage.
			timeout=30,
		)
		response.raise_for_status()
		text = response.json()["choices"][0]["message"]["content"]
	except (requests.RequestException, KeyError, IndexError):
		frappe.logger("fahrtenbuch").error("Kilometerstand-Erkennung fehlgeschlagen", exc_info=True)
		return None

	digits = re.sub(r"\D", "", text)
	return int(digits) if digits else None
