// Dummy NLP pipeline function
module.exports = function generateSummary(patient) {
  return {
    diagnosis: "General Checkup Required",
    symptoms: patient.symptoms || ["No symptoms found"],
    medications: ["Paracetamol"],
    allergies: patient.allergies || [],
    lifestyle: "Moderate"
  };
};
