import requests

url = "http://localhost:5000/api/ehr"  # change if needed

ehr_data = {
    "patientId": "P001",   # 🔹 REQUIRED
    
    # ✅ Summary as a paragraph (free-text)
    "summary": (
        "The patient Vinayak Kumar, 21 years old male, presented with high fever and body pain "
        "since 2 days. On examination, temperature was 101°F, blood pressure 120/80 mmHg, heart "
        "rate 88 bpm, and oxygen saturation 98%. Diagnosed as viral infection. "
        "Paracetamol 500mg prescribed twice daily for 5 days. Patient advised rest, hydration, "
        "and to avoid cold exposure. Follow-up scheduled after 10 days or earlier if symptoms worsen."
    ),

    # ✅ Patient Info
    "patient": {
        "name": {
            "family": "Kumar",
            "given": ["Vinayak"],
            "fullName": "Vinayak Kumar"
        },
        "gender": "male",
        "birthDate": "2004-05-15",
        "telecom": [
            {"system": "phone", "value": "+91-9876543210", "use": "mobile"}
        ],
        "address": {
            "line": ["123 Street"],
            "city": "Mumbai",
            "country": "India"
        }
    },

    # ✅ Practitioner
    "practitioner": {
        "id": "D001",
        "name": "Dr. Priya Sharma",
        "qualification": "General Medicine"
    },

    # ✅ Encounter
    "encounter": {
        "encounterId": "E001",
        "status": "finished",
        "class": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "AMB",
            "display": "ambulatory"
        },
        "participant": ["doctor-1"],
        "period": {
            "start": "2025-08-20T10:00:00+05:30",
            "end": "2025-08-20T10:30:00+05:30"
        }
    },

    # ✅ Conditions
    "conditions": [
        {
            "conditionId": "C001",
            "code": "Viral infection",
            "clinicalStatus": "active",
            "verificationStatus": "confirmed",
            "onsetDateTime": "2025-08-19"
        }
    ],

    # ✅ Symptoms (Observations)
    "observations": [
        {"observationId": "O001", "code": "Symptom", "valueString": "fever", "status": "final"},
        {"observationId": "O002", "code": "Symptom", "valueString": "body pain", "status": "final"}
    ],

    # ✅ Medications
    "medications": [
        {
            "medId": "M001",
            "name": "Paracetamol",
            "status": "active",
            "dosage": "500mg",
            "frequency": "2 times a day",
            "route": "oral",
            "authoredOn": "2025-08-20"
        }
    ],

    # ✅ Entities (NER extracted)
    "entities": [
        {"entity": "fever", "type": "Symptom"},
        {"entity": "body pain", "type": "Symptom"},
        {"entity": "paracetamol", "type": "Medication"}
    ],

    # ✅ Extra details
    "vitals": {
        "temperature": "101F",
        "bloodPressure": "120/80",
        "heartRate": "88",
        "oxygenSaturation": "98%"
    },
    "allergies": ["None"],
    "pastHistory": ["Asthma"],
    "followUpDate": "2025-08-30"
}

response = requests.post(url, json=ehr_data)
print(response.status_code)
print(response.json())
