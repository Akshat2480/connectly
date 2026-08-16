import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import Auth from "./Auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
});

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [me, setMe] = useState(null);

  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

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
    const socket = io(API_URL, { withCredentials: true });
    socketRef.current = socket;
    api
      .get("/conversations")
      .then((res) => setConversations(res.data.data.conversations));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthed]);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on("message:new", (msg) => {
      setMessages((prev) =>
        msg.conversation === activeConvo?._id ? [...prev, msg] : prev,
      );
      setConversations((prev) =>
        prev.map((c) =>
          c._id === msg.conversation ? { ...c, lastMessage: msg } : c,
        ),
      );
    });

    socketRef.current.on("typing:start", ({ userId }) =>
      setTypingUsers((prev) => new Set(prev).add(userId)),
    );
    socketRef.current.on("typing:stop", ({ userId }) =>
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      }),
    );

    return () => {
      socketRef.current.off("message:new");
      socketRef.current.off("typing:start");
      socketRef.current.off("typing:stop");
    };
  }, [socketRef, activeConvo]);

  const openConversation = async (convo) => {
    if (activeConvo)
      socketRef.current.emit("conversation:leave", activeConvo._id);
    setActiveConvo(convo);
    socketRef.current.emit("conversation:join", convo._id);
    const res = await api.get(`/conversations/${convo._id}/messages`);
    setMessages(res.data.data.messages.reverse());
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConvo) return;
    socketRef.current.emit(
      "message:send",
      { conversationId: activeConvo._id, text },
      (ack) => {
        if (ack?.error) console.error(ack.error);
      },
    );
    setText("");
    socketRef.current.emit("typing:stop", { conversationId: activeConvo._id });
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!activeConvo) return;
    socketRef.current.emit("typing:start", { conversationId: activeConvo._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current.emit("typing:stop", {
        conversationId: activeConvo._id,
      });
    }, 1500);
  };

  const handleLogout = async () => {
    await api.post("/users/logout");
    setIsAuthed(false);
    setMe(null);
    socketRef.current?.disconnect();
  };

  const otherParticipant = (convo) =>
    convo.participants.find((p) => p._id !== me?._id);

  if (!authChecked) return null;
  if (!isAuthed) return <Auth onAuthSuccess={() => window.location.reload()} />;

  return (
    <div className="h-screen flex bg-stone-50">
      {/* Side bar */}
      <aside className="w-72 shrink-0 border-r border-stone-200 bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-stone-100">
          <h1 className="text-lg font-semibold text-stone-900">Chats</h1>
          <button
            onClick={handleLogout}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
          >
            Log out
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-sm text-stone-400 px-4 py-6 text-center">
              No conversations yet
            </p>
          )}

          {conversations.map((c) => {
            const other = otherParticipant(c);
            const active = activeConvo?._id === c._id;
            return (
              <button
                key={c._id}
                onClick={() => openConversation(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 ${
                  active
                    ? "bg-teal-50 border-teal-700"
                    : "border-transparent hover:bg-stone-50"
                }`}
              >
                <img
                  src={other?.photo}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    {other?.name}
                  </div>
                  <div className="text-xs text-stone-500 truncate">
                    {c.lastMessage
                      ? `${c.lastMessage.sender.id === me._id ? "You" : `${c.lastMessage.sender.name.split(" ")[0]}`} : ${c.lastMessage.text}`
                      : "No messages yet"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat window */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeConvo ? (
          <>
            <header className="px-6 py-4 border-b border-stone-200 bg-white flex items-center gap-3">
              <img
                src={otherParticipant(activeConvo)?.photo}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="font-medium text-stone-900">
                {otherParticipant(activeConvo)?.name}
              </span>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
              {messages.map((m) => {
                const mine = m.sender._id === me?._id;
                return (
                  <div
                    key={m._id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 text-sm leading-relaxed rounded-2xl ${
                        mine
                          ? "bg-teal-800 text-white rounded-br-md"
                          : "bg-white border border-stone-200 text-stone-900 rounded-bl-md"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {typingUsers.size > 0 && (
              <div className="px-6 pb-1 text-xs text-stone-400 animate-pulse">
                typing…
              </div>
            )}

            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 px-4 py-3 border-t border-stone-200 bg-white"
            >
              <input
                value={text}
                onChange={handleTyping}
                placeholder="Type a message"
                className="flex-1 rounded-full border border-stone-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
              />
              <button
                type="submit"
                className="rounded-full bg-teal-800 text-white text-sm font-medium px-5 py-2 hover:bg-teal-900 transition-colors disabled:opacity-40"
                disabled={!text.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
            Select a conversation
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
