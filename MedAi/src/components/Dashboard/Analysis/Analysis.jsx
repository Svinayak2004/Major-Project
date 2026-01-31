import React, { useState, useEffect } from "react";
import { FaPlay, FaStop } from "react-icons/fa";
import axios from "axios";
import "./Consultation.css";

export default function ConsultationCard() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // -------------------------
  // START RECORDING
  // -------------------------
  const startRecording = async () => {
    setIsRecording(true);
    setRecordingTime(0);

    try {
      await axios.post("http://localhost:5000/api/python/start");
      console.log("Python speech script started");
    } catch (err) {
      console.error("Start Error:", err);
    }

    // Auto stop after 25 sec
    setTimeout(() => stopRecording(), 25000);
  };

  // -------------------------
  // STOP RECORDING
  // -------------------------
  const stopRecording = async () => {
    setIsRecording(false);

    try {
      await axios.post("http://localhost:5000/api/python/stop");
      console.log("Python speech script stopped");
    } catch (err) {
      console.error("Stop Error:", err);
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="consult-card">
      <div className="consult-header">
        <h3>AI-Powered Consultation</h3>
        <p>Record doctor–patient conversations</p>
      </div>

      <div className="consult-body">

        {/* Start Button */}
        {!isRecording && (
          <button className="primary-btn" onClick={startRecording}>
            <FaPlay /> Start Conversation
          </button>
        )}

        {/* Recording State */}
        {isRecording && (
          <div className="recording-box">
            <button className="stop-btn" onClick={stopRecording}>
              <FaStop /> Stop Recording
            </button>
            <p className="timer">Recording: {formatTime(recordingTime)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
