import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { me, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-teal-50 text-teal-800" : "text-stone-600 hover:bg-stone-50"
    }`;

  return (
    <div className="h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-3 border-b border-stone-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-800 text-white flex items-center justify-center text-sm font-semibold">
            C
          </div>
          <span className="font-semibold text-stone-900">Connectly</span>
        </div>

        <div className="flex items-center gap-1">
          <NavLink to="/feed" className={linkClass}>
            Feed
          </NavLink>
          <NavLink to="/chat" className={linkClass}>
            Chat
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          <img
            src={me?.photo}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
          <button
            onClick={logout}
            className="text-sm text-stone-400 hover:text-stone-700"
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
