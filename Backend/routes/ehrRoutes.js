const express = require("express");
const router = express.Router();

const {
  createEHR,
  getAllEHRs,
  getEHRById,
  updateEHR,
  deleteEHR,
  downloadEHRReport
} = require("../controllers/ehrController");

router.post("/create", createEHR);
router.get("/", getAllEHRs);

// ⚠️ order matters
router.get("/:id/report", downloadEHRReport);
router.get("/:id", getEHRById);

router.put("/:id", updateEHR);
router.delete("/:id", deleteEHR);

module.exports = router;
