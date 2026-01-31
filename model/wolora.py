#!/usr/bin/env python3
# wolora.py — EMR Generator using only Ollama (llama3.1)

import os
import sys
import json
import subprocess
from pathlib import Path
from pprint import pprint
from datetime import datetime

# Config
OLLAMA_MODEL = "llama3.1"
OLLAMA_TIMEOUT = 180
STRUCTURED_KEYS = [
    "Disease", "Symptoms", "Diagnosis", "Medication",
    "Dosage", "Duration", "FollowUp", "OtherAdvice",
    "BodyPart", "Test", "Treatment"
]

# Resolve Ollama path
def get_ollama_command():
    try:
        proc = subprocess.run(["where", "ollama"], capture_output=True, text=True)
        if proc.stdout.strip():
            return ["ollama"]
    except:
        pass
    default_path = r"C:\Users\Vinayak\AppData\Local\Programs\Ollama\ollama.exe"
    if Path(default_path).exists():
        return [default_path]
    print("Error: Could not locate ollama.exe. Add it to PATH or update get_ollama_command().")
    sys.exit(1)

# Run Ollama
def run_ollama(prompt, model=OLLAMA_MODEL, timeout=OLLAMA_TIMEOUT):
    cmd = get_ollama_command() + ["run", model]
    try:
        proc = subprocess.run(
            cmd,
            input=prompt.encode("utf-8"),
            capture_output=True,
            timeout=timeout
        )
        return proc.stdout.decode("utf-8").strip()
    except Exception as e:
        print(f"Ollama call failed: {e}")
        return None

# Extract summary + JSON NER
def extract_entities_and_summary(text):
    keys = ", ".join(STRUCTURED_KEYS)
    prompt = f"""
You are a clinical summarization and NER expert.

Task:
1. Summarize the following doctor–patient conversation into 2–3 concise sentences.
2. Extract structured clinical entities for EHR in this FIXED JSON format:

{{
  "Disease": "",
  "Symptoms": [],
  "Diagnosis": "",
  "Medication": [],
  "Dosage": [],
  "Duration": [],
  "FollowUp": "",
  "OtherAdvice": "",
  "BodyPart": [],
  "Test": [],
  "Treatment": []
}}

Rules:
- Return ONLY the JSON object above.
- Preserve all numeric values (mg, days, etc.).
- Use empty string "" or empty list [] if data is missing.
- Do not hallucinate or add extra text.

Conversation:
\"\"\"{text}\"\"\"

Return ONLY JSON.
"""
    return run_ollama(prompt)

# FHIR bundle generation
def to_fhir_bundle(entities):
    now = datetime.now().isoformat()
    bundle = {"resourceType": "Bundle", "type": "collection", "entry": []}

    if entities.get("Diagnosis"):
        bundle["entry"].append({
            "resource": {
                "resourceType": "Condition",
                "code": {"text": entities["Diagnosis"]},
                "recordedDate": now
            }
        })

    for s in entities.get("Symptoms", []):
        bundle["entry"].append({
            "resource": {
                "resourceType": "Observation",
                "code": {"text": s},
                "effectiveDateTime": now
            }
        })
    return bundle

# Main
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", required=True)
    parser.add_argument("--out", "-o", default="out")
    args = parser.parse_args()

    input_file = args.input
    output_dir = Path(args.out)
    output_dir.mkdir(exist_ok=True)

    text = Path(input_file).read_text(encoding="utf-8")

    print("\nSummarizing and extracting medical entities...")
    response = extract_entities_and_summary(text)

    if not response:
        print("NER extraction failed.")
        sys.exit(1)

    try:
        entities = json.loads(response)
    except json.JSONDecodeError:
        print("Failed to parse JSON from Ollama output:")
        print(response)
        sys.exit(1)

    print("\nExtracted entities:")
    pprint(entities)

    fhir = to_fhir_bundle(entities)

    # Save outputs
    (output_dir / "entities.json").write_text(json.dumps(entities, indent=2), encoding="utf-8")
    (output_dir / "fhir_bundle.json").write_text(json.dumps(fhir, indent=2), encoding="utf-8")

    print(f"\nDone. Saved files to: {output_dir}")

# -----------------------------------------
# SEND EHR TO BACKEND (Node.js)
# -----------------------------------------
import requests

try:
    print("\nSending EHR data to backend...")

    res = requests.post(
        "http://localhost:5000/api/ehr/create",
        json={
            "patientId": "AUTO-GEN-" + datetime.now().strftime("%Y%m%d%H%M%S"),
            "summary": {
                "diagnosis": entities.get("Diagnosis", ""),
                "symptoms": entities.get("Symptoms", []),
                "medications": entities.get("Medication", []),
                "advice": entities.get("OtherAdvice", ""),
                "prognosis": ""
            },
            "conditions": [
                {
                    "code": entities.get("Disease", ""),
                    "clinicalStatus": "active"
                }
            ],
            "observations": [
                {"valueString": s, "status": "final"}
                for s in entities.get("Symptoms", [])
            ],
            "medications": [
                {
                    "name": med,
                    "dosage": entities["Dosage"][i] if i < len(entities["Dosage"]) else "",
                    "frequency": "",
                    "route": ""
                }
                for i, med in enumerate(entities.get("Medication", []))
            ],
            "entities": [
                {"entity": v, "type": key}
                for key, values in entities.items()
                if isinstance(values, list)
                for v in values
            ]
        }
    )

    print("Backend response:", res.json())

except Exception as e:
    print("Failed to send to backend:", e)
