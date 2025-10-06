const mongoose = require("mongoose");

const EhrSchema = new mongoose.Schema({
  patientId: { type: String, required: true },   // Unique patient identifier

  // ✅ Auto-generated structured summary (from NLP)
  summary: {
    diagnosis: { type: String },
    symptoms: [{ type: String }],
    medications: [{ type: String }],
    advice: { type: String },
    prognosis: { type: String }
  },

  // ✅ Patient Info
  patient: {
    name: {
      family: { type: String },
      given: [{ type: String }],
      fullName: { type: String }
    },
    gender: { type: String, enum: ["male", "female", "other"] },
    birthDate: { type: Date },
    telecom: [
      {
        system: { type: String },  // phone/email
        value: { type: String },
        use: { type: String }
      }
    ],
    address: {
      line: [{ type: String }],
      city: { type: String },
      country: { type: String }
    }
  },

  // ✅ Practitioner Info
  practitioner: {
    id: { type: String },
    name: { type: String },
    qualification: { type: String }
  },

  // ✅ Encounter details
  encounter: {
    encounterId: { type: String },
    status: { type: String },
    class: {
      system: { type: String },
      code: { type: String },
      display: { type: String }
    },
    participant: [{ type: String }],  // references to practitioners
    period: {
      start: { type: Date },
      end: { type: Date }
    }
  },

  // ✅ Conditions / Diagnoses
  conditions: [
    {
      conditionId: { type: String },
      code: { type: String },           // e.g., "Hepatitis"
      clinicalStatus: { type: String }, // active, resolved
      verificationStatus: { type: String }, // confirmed, unconfirmed
      onsetDateTime: { type: Date }
    }
  ],

  // ✅ Symptoms (from Observation)
  observations: [
    {
      observationId: { type: String },
      code: { type: String },          // e.g., "Symptom"
      valueString: { type: String },   // e.g., "high fever"
      status: { type: String }         // final, preliminary
    }
  ],

  // ✅ Medications (from MedicationRequest)
  medications: [
    {
      medId: { type: String },
      name: { type: String },          // "Parasiteamol"
      status: { type: String },
      dosage: { type: String },
      frequency: { type: String },
      route: { type: String },
      authoredOn: { type: Date }
    }
  ],

  // ✅ Care Plan (optional extension)
  carePlan: {
    planId: { type: String },
    status: { type: String },
    intent: { type: String },
    description: { type: String }
  },

  // ✅ Extracted NLP entities (NER)
  entities: [
    {
      entity: { type: String },       // e.g., "fever"
      type: { type: String }          // e.g., "symptom"
    }
  ],

  // ✅ Additional details
  vitals: {
    temperature: { type: String },
    bloodPressure: { type: String },
    heartRate: { type: String },
    oxygenSaturation: { type: String }
  },
  allergies: [{ type: String }],
  pastHistory: [{ type: String }],
  followUpDate: { type: Date },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Ehr", EhrSchema);
