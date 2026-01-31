import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./RecordEdit.css";

export default function RecordEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    patientId: "",
    name: "",
    gender: "",
    birthDate: "",
    diagnosis: "",
    symptoms: "",
    medications: "",
    advice: "",
    temperature: "",
    bloodPressure: "",
    heartRate: "",
    oxygenSaturation: "",
    followUpDate: "",
  });

  const [loading, setLoading] = useState(true);

  // Fetch EHR data when component loads
  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/ehr/${id}`);
        const data = await res.json();

        if (res.ok && data) {
          setFormData({
            patientId: data.patientId || "",
            name: data.patient?.name?.fullName || "",
            gender: data.patient?.gender || "",
            birthDate: data.patient?.birthDate
              ? data.patient.birthDate.slice(0, 10)
              : "",
            diagnosis:
              data.summary?.diagnosis || data.conditions?.[0]?.code || "",
            symptoms:
              (data.observations?.map((o) => o.valueString) || []).join(", "),
            medications:
              (data.medications?.map(
                (m) => `${m.name || "Unknown"} (${m.dosage || "-"})`
              ) || []).join(", "),
            advice: data.summary?.advice || "",
            temperature: data.vitals?.temperature || "",
            bloodPressure: data.vitals?.bloodPressure || "",
            heartRate: data.vitals?.heartRate || "",
            oxygenSaturation: data.vitals?.oxygenSaturation || "",
            followUpDate: data.followUpDate
              ? data.followUpDate.slice(0, 10)
              : "",
          });
        } else {
          console.error("Failed to load record:", data.message);
        }
      } catch (err) {
        console.error("Error fetching record:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formattedData = {
        patientId: formData.patientId,
        patient: {
          name: { fullName: formData.name },
          gender: formData.gender,
          birthDate: formData.birthDate,
        },
        summary: {
          diagnosis: formData.diagnosis,
          advice: formData.advice,
          symptoms: formData.symptoms
            ? formData.symptoms.split(",").map((s) => s.trim())
            : [],
          medications: formData.medications
            ? formData.medications.split(",").map((m) => {
                const match = m.match(/(.+?)\s*\((.*?)\)/);
                return match ? match[1].trim() : m.trim();
              })
            : [],
        },
        observations: formData.symptoms
          ? formData.symptoms.split(",").map((s, i) => ({
              observationId: `O${i + 1}`,
              code: "Symptom",
              valueString: s.trim(),
              status: "final",
            }))
          : [],
        medications: formData.medications
          ? formData.medications.split(",").map((m, i) => {
              const match = m.match(/(.+?)\s*\((.*?)\)/);
              return {
                medId: `M${i + 1}`,
                name: match ? match[1].trim() : m.trim(),
                dosage: match ? match[2].trim() : "",
              };
            })
          : [],
        vitals: {
          temperature: formData.temperature,
          bloodPressure: formData.bloodPressure,
          heartRate: formData.heartRate,
          oxygenSaturation: formData.oxygenSaturation,
        },
        followUpDate: formData.followUpDate,
      };

      console.log("Sending formatted data:", formattedData);

      const res = await fetch(`http://localhost:5000/api/ehr/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Record updated successfully!");
        navigate(`/patient/${id}`);
      } else {
        alert("Error updating record: " + (data.error || data.message));
      }
    } catch (err) {
      console.error("Error updating:", err);
      alert("Something went wrong while saving changes.");
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) return <p>Loading record details...</p>;

  return (
    <div className="record-edit-overlay">
      <div className="record-edit-container">
        <h2>Edit Patient Record</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Patient ID
            <input
              type="text"
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              disabled
            />
          </label>

          <label>
            Name
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </label>

          <label>
            Gender
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label>
            Birth Date
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
            />
          </label>

          <label>
            Diagnosis
            <input
              type="text"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
            />
          </label>

          <label>
            Symptoms (comma separated)
            <input
              type="text"
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
            />
          </label>

          <label>
            Medications (comma separated)
            <input
              type="text"
              name="medications"
              value={formData.medications}
              onChange={handleChange}
            />
          </label>

          <label>
            Advice
            <textarea
              name="advice"
              value={formData.advice}
              onChange={handleChange}
            />
          </label>

          <h3>Vitals</h3>
          <label>
            Temperature
            <input
              type="text"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
            />
          </label>
          <label>
            Blood Pressure
            <input
              type="text"
              name="bloodPressure"
              value={formData.bloodPressure}
              onChange={handleChange}
            />
          </label>
          <label>
            Heart Rate
            <input
              type="text"
              name="heartRate"
              value={formData.heartRate}
              onChange={handleChange}
            />
          </label>
          <label>
            Oxygen Saturation
            <input
              type="text"
              name="oxygenSaturation"
              value={formData.oxygenSaturation}
              onChange={handleChange}
            />
          </label>

          <label>
            Follow-up Date
            <input
              type="date"
              name="followUpDate"
              value={formData.followUpDate}
              onChange={handleChange}
            />
          </label>

          <div className="edit-actions">
            <button type="submit" className="save-btn">
              Save
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
