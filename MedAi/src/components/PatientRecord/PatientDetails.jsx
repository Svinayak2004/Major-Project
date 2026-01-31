import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./PatientDetails.css";

function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/ehr/${id}`);
        if (!res.ok) {
          console.error("Failed to fetch patient record");
          setPatient(null);
          return;
        }
        const data = await res.json();
        console.log("Fetched EHR Data:", data);
        setPatient(data);
      } catch (err) {
        console.error("Error fetching patient:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  if (loading) return <p>Loading patient details...</p>;
  if (!patient) return <p>No patient record found.</p>;

  // Extract data safely
  const name = patient.patient?.name?.fullName || 
               `${patient.patient?.name?.given?.[0] || ""} ${patient.patient?.name?.family || ""}`;
  const gender = patient.patient?.gender || "N/A";
  const birthDate = patient.patient?.birthDate
    ? new Date(patient.patient.birthDate).toLocaleDateString()
    : "N/A";
  const disease = patient.conditions?.[0]?.code || "N/A";
  const symptoms = patient.observations?.map((o) => o.valueString) || [];
  const medications = patient.medications?.map(
    (m) => `${m.name} (${m.dosage})`
  ) || [];
  const temperature = patient.vitals?.temperature || "N/A";
  const bloodPressure = patient.vitals?.bloodPressure || "N/A";
  const heartRate = patient.vitals?.heartRate || "N/A";
  const allergies = patient.allergies?.join(", ") || "None";
  const pastHistory = patient.pastHistory?.join(", ") || "None";
  const followUpDate = patient.followUpDate
    ? new Date(patient.followUpDate).toLocaleDateString()
    : "N/A";

  // Helper function to safely join array
  const safeJoin = (arr, fallback = "N/A") =>
    Array.isArray(arr) && arr.length > 0 ? arr.join(", ") : fallback;

  return (
    <div className="patient-detail-container">
      <button className="back-btn" onClick={() => navigate(-1)}>⬅ Back</button>
      <h2>Patient Details</h2>

      <div className="patient-info">
        <p><strong>Patient ID:</strong> {patient.patientId || "N/A"}</p>
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Gender:</strong> {gender}</p>
        <p><strong>Date of Birth:</strong> {birthDate}</p>
        <p><strong>Disease:</strong> {disease}</p>
        <p><strong>Symptoms:</strong> {safeJoin(symptoms)}</p>
        <p><strong>Medications:</strong> {safeJoin(medications)}</p>
        <p><strong>Vitals:</strong> Temp {temperature}, HR {heartRate}, BP {bloodPressure}</p>
        <p><strong>Allergies:</strong> {allergies}</p>
        <p><strong>Past History:</strong> {pastHistory}</p>
        <p><strong>Follow-Up Date:</strong> {followUpDate}</p>
        <p>
          <strong>Created At:</strong>{" "}
          {patient.createdAt
            ? new Date(patient.createdAt).toLocaleString()
            : "N/A"}
        </p>
      </div>
    </div>
  );
}

export default PatientDetail;
