import { createContext, useState, useEffect, useContext } from "react";
import { api, API_URL } from "../lib/api";
import { io } from "socket.io-client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    api
      .get("/users/me")
      .then((res) => {
        setMe(res.data.data.user);
        setIsAuthed(true);
      })
      .catch(() => setIsAuthed(false))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    const s = io(API_URL, { withCredentials: true });

    s.on("connect", () => {
      setSocket(s);
    });

    return () => {
      s.off("connect");
      s.disconnect();
      setSocket(null);
    };
  }, [isAuthed]);

  const login = async (credential) => {
    await api.post("/users/login", credential);
    const res = await api.get("/users/me");
    setMe(res.data.data.user);
    setIsAuthed(true);
  };

  const register = async (payload) => {
    await api.post("/users/register", payload);
    const res = await api.get("/users/me");
    setMe(res.data.data.user);
    setIsAuthed(true);
  };

  const logout = async () => {
    await api.post("/users/logout");
    socket.disconnect();
    setSocket(null);
    setMe(null);
    setIsAuthed(false);
  };

  return (
    <AuthContext.Provider
      value={{ me, isAuthed, authChecked, socket, register, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
