import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../views/Login';
import Dashboard from '../views/Dashboard'; // patient dashboard
import DoctorDashboard from '../views/DoctorDashboard';
import BookAppointment from '../views/BookAppointment';
import Signup from '../views/Signup';

export default function App() {
  return (
    <Routes>
            <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
            <Route path="/patient/dashboard" element={<Dashboard />} />
      <Route path="/patient/book" element={<BookAppointment />} />
      <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
