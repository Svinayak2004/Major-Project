const express = require("express");
const router = express.Router();
const { createEHR, getAllEHRs, getEHRById, updateEHR, deleteEHR } = require("../controllers/ehrController");

router.post("/", createEHR);                // Create new EHR
router.get("/", getAllEHRs);                // Get all EHRs
router.get("/:id", getEHRById);             // Get one EHR by MongoDB _id
router.put("/:id", updateEHR);              // Update by _id
router.delete("/:id", deleteEHR);           // Delete by _id

module.exports = router;
