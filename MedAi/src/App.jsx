import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/HomePage/HomePage.jsx';
import FeaturesPage from './components/FeaturesPage/FeaturePage.jsx';
import SignInPage from './Auth/SignInPage/SignInPage.jsx';
import SignUpPage from './Auth/SignUpPage/SignUpPage.jsx';
import DashboardPage from './Pages/Dashboard/Dashboard.jsx';
import PatientDetail from "./components/PatientRecord/PatientDetails.jsx";
import RecordEdit from "./components/Dashboard/RecordEdit/RecordEdit";


import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/edit/:id" element={<RecordEdit />} />

        {/* ✅ use lowercase for consistency */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patient/:id" element={<PatientDetail />} />

      </Routes>
    </Router>
  );
}

export default App;