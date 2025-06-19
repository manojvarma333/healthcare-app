import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [income, setIncome] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    const fetchData = async () => {
      try {
        const [{ data: appts }, { data: incomeResp }] = await Promise.all([
          api.get('/provider/appointments'),
          api.get('/provider/income'),
        ]);
        setAppointments(appts);
        setIncome(incomeResp);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [navigate]);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4 text-primary">Doctor Dashboard</h1>
        {income && (
          <div className="mb-6 p-4 bg-green-100 rounded">
            <p className="font-medium">Income {income.date === 'all' ? 'total:' : `for ${income.date}:` }</p>
            <p className="text-2xl text-green-700 font-bold">₹{income.income}</p>
          </div>
        )}
        <h2 className="text-xl font-semibold mb-3">My Appointments</h2>
        {appointments.length === 0 ? (
          <p>No appointments scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {appointments.map((appt) => (
              <li
                key={appt.id}
                className="p-4 bg-white shadow rounded border-l-4 border-secondary"
              >
                <p className="font-medium">{appt.type}</p>
                <p className="text-sm text-gray-600">
                  {new Date(appt.scheduledDate).toLocaleString()}
                </p>
                <p className="text-sm capitalize">Patient: {appt.patientId}</p>
                <p className="text-sm capitalize">Status: {appt.status}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
