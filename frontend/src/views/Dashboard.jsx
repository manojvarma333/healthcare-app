import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import api from '../api';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    const fetchData = async () => {
      try {
        const { data } = await api.get('/appointments');
        setAppointments(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [navigate]);

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4 text-primary">My Appointments</h1>
        <Button variant="secondary" className="mb-4" onClick={() => navigate('/patient/book')}>
          Book New Appointment
        </Button>
        {appointments.length === 0 ? (
          <p>No appointments found.</p>
        ) : (
          <ul className="space-y-3">
            {appointments.map((appt) => (
              <li
                key={appt.id}
                className="p-4 bg-white shadow rounded border-l-4 border-primary"
              >
                <p className="font-medium">{appt.type}</p>
                <p className="text-sm text-gray-600">
                  {new Date(appt.scheduledDate).toLocaleString()}
                </p>
                <p className="text-sm capitalize">Status: {appt.status}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
