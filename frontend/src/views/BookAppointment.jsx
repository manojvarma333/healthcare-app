import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookAppointment() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('General Consultation');
  const [providerId, setProviderId] = useState('');
  const [providers, setProviders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get('/providers');
      setProviders(data);
      if (data.length) setProviderId(data[0].id);
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const scheduledDate = new Date(`${date}T${time}:00`).toISOString();
    try {
      const { data: appt } = await api.post('/appointments', {
        providerId,
        providerName: providers.find((p) => p.id === providerId)?.name,
        scheduledDate,
        duration: 30,
        type,
      });

      // create payment order
      const { data: orderResp } = await api.post('/payments/order', {
        appointmentId: appt.id,
      });

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Unable to load payment SDK.');
        return;
      }

      const rzp = new window.Razorpay({
        key: orderResp.keyId,
        order_id: orderResp.orderId,
        amount: 50000,
        currency: 'INR',
        name: 'Healthcare Appointment',
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              appointmentId: appt.id,
              ...response,
            });
            alert('Payment successful');
            navigate('/patient/dashboard');
          } catch (err) {
            console.error(err);
            alert('Payment verification failed');
          }
        },
        prefill: {},
        theme: { color: '#0d6efd' },
      });
      rzp.open();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded shadow-md w-full max-w-md"
        >
          <h1 className="text-2xl font-semibold mb-6 text-center text-primary">
            Book Appointment
          </h1>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Time</label>
            <input
              type="time"
              className="w-full px-3 py-2 border rounded"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Doctor</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              required
            >
              {providers.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-1">Type</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option>General Consultation</option>
              <option>Follow-up</option>
              <option>Physical Exam</option>
            </select>
          </div>
          <Button variant="secondary" type="submit" className="w-full">
            Confirm
          </Button>
        </form>
      </div>
    </Layout>
  );
}
