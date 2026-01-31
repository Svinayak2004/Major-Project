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
    participant: [{ type: String }],  
    period: {
      start: { type: Date },
      end: { type: Date }
    }
  },

  // ✅ Conditions / Diagnoses
  conditions: [
    {
      conditionId: { type: String },
      code: { type: String },           
      clinicalStatus: { type: String }, 
      verificationStatus: { type: String },
      onsetDateTime: { type: Date }
    }
  ],

  // ✅ Symptoms (Observation)
  observations: [
    {
      observationId: { type: String },
      code: { type: String },
      valueString: { type: String },
      status: { type: String }
    }
  ],

  // ✅ Medications (MedicationRequest)
  medications: [
    {
      medId: { type: String },
      name: { type: String },
      status: { type: String },
      dosage: { type: String },
      frequency: { type: String },
      route: { type: String },
      authoredOn: { type: Date }
    }
  ],

  // ✅ Care Plan (optional)
  carePlan: {
    planId: { type: String },
    status: { type: String },
    intent: { type: String },
    description: { type: String }
  },

  // ✅ Extracted NLP Entities (NER)
  entities: [
    {
      entity: { type: String },  
      type: { type: String }     
    }
  ],

  // ✅ Additional Vitals
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
