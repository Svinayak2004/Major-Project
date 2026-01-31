const express = require("express");
const { spawn } = require("child_process");
const path = require("path");

const router = express.Router();
let pythonProcess = null;

// ✅ ABSOLUTE PATH
const PYTHON_SCRIPT = path.join(
  __dirname,
  "..",
  "..",
  "model",
  "demo_real_speech.py"
);

// ▶ START PYTHON PROCESS
router.post("/start", (req, res) => {
  if (pythonProcess) {
    return res.json({ message: "Python already running" });
  }

  console.log("Starting Python:", PYTHON_SCRIPT);

  pythonProcess = spawn(
    "python",
    ["-u", PYTHON_SCRIPT], // ⭐ -u = UNBUFFERED OUTPUT
    {
      cwd: path.join(__dirname, "..", "..", "model"),
      shell: true
    }
  );

  pythonProcess.stdout.on("data", (data) => {
    console.log("PYTHON:", data.toString());
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error("PYTHON ERROR:", data.toString());
  });

  pythonProcess.on("close", (code) => {
    console.log("Python stopped with code:", code);
    pythonProcess = null;
  });

  res.json({ success: true, message: "Python started" });
});

// ■ STOP PYTHON PROCESS
router.post("/stop", (req, res) => {
  if (!pythonProcess) {
    return res.json({ message: "Not running" });
  }

  console.log("Stopping Python...");
  pythonProcess.kill("SIGINT");
  pythonProcess = null;

  res.json({ success: true, message: "Python stopped" });
});

module.exports = router;
