import { auth } from '../firebase';

import { useNavigate } from 'react-router-dom';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <h1
            className="text-xl font-semibold text-primary cursor-pointer"
            onClick={() => navigate('/')}
          >
            Healthcare
          </h1>
          {auth.currentUser && (
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm bg-rose-500 hover:bg-rose-600 text-white rounded-md transition"
            >
              Log out
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">{children}</main>
    </div>
  );
}
