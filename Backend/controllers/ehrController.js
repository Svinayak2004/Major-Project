  const EHR = require("../models/EHR");

  // Store new EHR
  const createEHR = async (req, res) => {
    try {
      const ehr = new EHR(req.body);
      await ehr.save();
      res.status(201).json(ehr);   // return only the document
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };


  // Get all EHRs
  const getAllEHRs = async (req, res) => {
    try {
      const records = await EHR.find().sort({ createdAt: -1 });
      res.json(records);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  

  // Get EHR by MongoDB _id
  const getEHRById = async (req, res) => {
    try {
      const record = await EHR.findById(req.params.id);
      if (!record) return res.status(404).json({ message: "No record found" });
      res.json(record);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };


  // Get EHR by patientId
  const getEHRByPatient = async (req, res) => {
    try {
      const record = await EHR.findOne({ patientId: req.params.patient_id }); // ✅ match schema field
      if (!record) return res.status(404).json({ message: "No record found" });
      res.json(record);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

//   exports.getEHRByPatientId = async (req, res) => {
//   try {
//     const { patientId } = req.params;
//     const ehr = await EHR.findOne({ patientId });

//     if (!ehr) {
//       return res.status(404).json({ message: "EHR not found" });
//     }

//     res.json(ehr);
//   } catch (err) {
//     res.status(500).json({ message: "Server Error", error: err.message });
//   }
//  };

const updateEHR = async (req, res) => {
  try {
    // Only set provided fields (don’t replace entire document)
    const updated = await EHR.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, // ✅ key fix
      { new: true, runValidators: true }
      
    );

    if (!updated) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ message: "EHR updated successfully", ehr: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message });
  }
};
  const deleteEHR = async (req, res) => {
  try {
    const deleted = await EHR.findByIdAndDelete(req.params.id);  // ✅ _id not patientId
    if (!deleted) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "EHR deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



module.exports = { createEHR, getAllEHRs, getEHRById, deleteEHR, updateEHR };
