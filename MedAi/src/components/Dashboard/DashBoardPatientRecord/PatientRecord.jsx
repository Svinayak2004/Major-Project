import { useEffect, useState } from "react";
import { Edit, Trash2, Download } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import "./PatientRecord.css";

export function PatientRecordCard() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/ehr");
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error("Error fetching patients:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/ehr/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPatients((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (err) {
      console.error("Error deleting patient:", err);
    }
  };

  // ✅ PDF DOWNLOAD (ONLY CHANGE)
  const handleDownload = async (id, patientId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/ehr/${id}/report`);
      if (!res.ok) throw new Error("Failed to fetch report");

      const data = await res.json();
      const doc = new jsPDF();

      let y = 20;

      // --- Header ---
      doc.setFillColor(41, 128, 185); // Blue
      doc.rect(0, 0, 210, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("Electronic Health Record (EHR)", 105, 14, { align: "center" });

      y += 15;

      // --- Patient Information Box ---
      doc.setDrawColor(52, 152, 219);
      doc.setFillColor(235, 245, 251); // Light blue background
      doc.rect(10, y, 190, 35, "FD");
      doc.setFontSize(12);
      doc.setTextColor(52, 152, 219);
      doc.text("Patient Information", 14, y + 7);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Patient ID: ${data.patientId}`, 14, y + 15);
      doc.text(`Name: ${data.patient?.name || "N/A"}`, 14, y + 22);
      doc.text(`Gender: ${data.patient?.gender || "N/A"}`, 14, y + 29);
      doc.text(
        `DOB: ${data.patient?.birthDate
          ? new Date(data.patient.birthDate).toLocaleDateString()
          : "N/A"
        }`,
        100,
        y + 22
      );
      y += 45;

      // Function to create section boxes
      const createSection = (title, content, color, boxHeight) => {
        doc.setFillColor(...color.bg);
        doc.setDrawColor(...color.border);
        doc.rect(10, y, 190, boxHeight, "FD");
        doc.setTextColor(...color.title);
        doc.setFontSize(12);
        doc.text(title, 14, y + 7);
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        content.forEach((line, index) => {
          doc.text(line, 14, y + 15 + index * 7);
        });
        y += boxHeight + 5;
      };

      // --- Diagnosis ---
      createSection(
        "Diagnosis",
        [data.diagnosis || "N/A"],
        { bg: [254, 235, 230], border: [231, 76, 60], title: [231, 76, 60] },
        20
      );

      // --- Symptoms ---
      createSection(
        "Symptoms",
        [data.symptoms?.join(", ") || "N/A"],
        { bg: [235, 251, 235], border: [39, 174, 96], title: [39, 174, 96] },
        25
      );

      // --- Medications ---
      const meds = data.medications?.length
        ? data.medications.map((m) => `• ${m.name || "-"} (${m.dosage || "-"})`)
        : ["N/A"];
      createSection(
        "Medications",
        meds,
        { bg: [235, 244, 251], border: [41, 128, 185], title: [41, 128, 185] },
        meds.length * 7 + 15
      );

      // --- Vitals ---
      createSection(
        "Vitals",
        [
          `BP: ${data.vitals?.bloodPressure || "-"}, Temp: ${data.vitals?.temperature || "-"
          }, HR: ${data.vitals?.heartRate || "-"}`
        ],
        { bg: [247, 236, 251], border: [155, 89, 182], title: [155, 89, 182] },
        20
      );

      // --- Practitioner ---
      createSection(
        "Practitioner",
        [`${data.practitioner?.name || "N/A"} ${data.practitioner?.qualification || ""}`],
        { bg: [255, 247, 236], border: [243, 156, 18], title: [243, 156, 18] },
        20
      );

      // --- Footer ---
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.text(
        `Report Generated On: ${new Date(data.createdAt).toLocaleDateString()}`,
        14,
        y + 5
      );

      doc.save(`EHR_Report_${patientId}.pdf`);
    } catch (err) {
      console.error("PDF Download error:", err);
      alert("Failed to download PDF report");
    }
  };




  const filteredPatients = patients.filter((patient) => {
    const name =
      patient.patient?.name?.given?.[0]?.toLowerCase() ||
      patient.patient?.name?.fullName?.toLowerCase() ||
      "";
    const id = patient.patientId?.toLowerCase() || "";
    const disease = patient.summary?.diagnosis?.toLowerCase() || "";

    return (
      name.includes(searchTerm.toLowerCase()) ||
      id.includes(searchTerm.toLowerCase()) ||
      disease.includes(searchTerm.toLowerCase())
    );
  });

  if (loading) return <p>Loading patient records...</p>;

  return (
    <div className="patient-records-container">
      <div className="patient-records-header">
        <h2>Patient Records</h2>
        <p>Manage and view all patient records in your system</p>
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, ID, disease, or symptoms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <table className="patient-table">
        <thead>
          <tr>
            <th>Patient ID</th>
            <th>Name</th>
            <th>Disease</th>
            <th>Symptoms</th>
            <th>Medications</th>
            <th>Last Visit</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPatients.map((patient) => (
            <tr
              key={patient._id}
              className="clickable-row"
              onClick={() => navigate(`/patient/${patient._id}`)}
            >
              <td>{patient.patientId}</td>
              <td>
                {patient.patient?.name?.fullName ||
                  patient.patient?.name?.given?.[0]}
              </td>
              <td>{patient.summary?.diagnosis || "N/A"}</td>
              <td>{patient.summary?.symptoms?.join(", ") || "N/A"}</td>
              <td>
                {patient.medications
                  ?.map((m) => `${m.name} (${m.dosage})`)
                  .join(", ") || "N/A"}
              </td>
              <td>
                {new Date(patient.createdAt).toLocaleDateString()}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="table-actions">
                  <button
                    className="action-btn edit-btn"
                    onClick={() => navigate(`/edit/${patient._id}`)}
                  >
                    <Edit className="icon" />
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(patient._id)}
                  >
                    <Trash2 className="icon" />
                  </button>
                  <button
                    className="action-btn download-btn"
                    onClick={() =>
                      handleDownload(patient._id, patient.patientId)
                    }
                  >
                    <Download className="icon" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PatientRecordCard;
