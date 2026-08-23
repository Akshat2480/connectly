import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const formatTime = (date) =>
  new Date(date).toLocaleDateString([], { hour: "2-digit", minute: "2-digit" });

function App() {
  const { me, socket } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Set());

  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetechConversations = async () => {
      const res = await api.get("/conversations");
      const conversations = res.data.data.conversations;

      const conversationsWithUnread = await Promise.all(
        conversations.map(async (convo) => {
          const res = await api.get(`/conversations/${convo._id}/messages`);

          const unreadMessages = res.data.data.messages.filter(
            (m) => !m.readBy.includes(me._id),
          );

          return {
            ...convo,
            unreadMessages: unreadMessages.length,
          };
        }),
      );
      setConversations(conversationsWithUnread);
    };

    fetechConversations();
  }, [me]);

  useEffect(() => {
    if (!socket) return;

    socket.on("typing:start", ({ userId }) => {
      setTypingUsers((prev) => new Set(prev).add(userId));
    });

    socket.on("typing:stop", ({ userId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on("message:new", (msg) => {
      setMessages((prev) =>
        msg.conversation === activeConvo?._id ? [...prev, msg] : prev,
      );

      if (msg.conversation === activeConvo?._id) {
        socket.emit("message:read", { messageId: msg._id });
        setConversations((prev) =>
          prev.map((c) =>
            c._id === msg.conversation ? { ...c, lastMessage: msg } : c,
          ),
        );
        return;
      }

      setConversations((prev) =>
        prev.map((convo) =>
          convo._id === msg.conversation
            ? {
                ...convo,
                lastMessage: msg,
                unreadMessages: convo.unreadMessages + 1,
              }
            : convo,
        ),
      );
    });

    return () => {
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("message:new");
    };
  }, [socket, activeConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const otherParticipant = (convo) => {
    return convo.participants.find((p) => p._id != me._id);
  };

  const openConversation = async (convo) => {
    setActiveConvo(convo);

    const res = await api.get(`/conversations/${convo._id}/messages`);
    const fetchedMessages = res.data.data.messages.reverse();
    setMessages(fetchedMessages);

    socket.emit("conversation:MarkRead", { conversationId: convo._id });

    setConversations((prev) =>
      prev.map((c) => (c._id === convo._id ? { ...c, unreadMessages: 0 } : c)),
    );
  };

  const handleTyping = (e) => {
    setText(e.target.value);

    socket.emit("typing:start", { conversationId: activeConvo._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", {
        conversationId: activeConvo._id,
      });
    }, 1000);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConvo) return;

    socket.emit(
      "message:send",
      {
        conversationId: activeConvo._id,
        text,
      },
      (ack) => {
        if (ack.error) console.error(ack.error);
      },
    );

    setText("");
    socket.emit("typing:stop", { conversationId: activeConvo._id });
  };

  return (
    <div className="h-full flex bg-stone-50">
      <aside className="w-72 shrink-0 border-r border-stone-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-stone-100">
          <h1 className="text-lg font-semibold text-stone-900">Chats</h1>
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
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    {other?.name}
                  </div>
                  <div className="text-xs text-stone-500 truncate">
                    {c.lastMessage?.text || "No messages yet"}
                  </div>
                  {c.unreadMessages > 0 && (
                    <div className="mt-1 inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                      {c.unreadMessages} unread
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

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
                      <div>{m.text}</div>
                      <div
                        className={`flex items-center gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <span
                          className={` text-[10px] ${mine ? "text-teal-100/80" : "text-stone-400"}`}
                        >
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
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
                disabled={!text.trim()}
                className="rounded-full bg-teal-800 text-white text-sm font-medium px-5 py-2 hover:bg-teal-900 transition-colors disabled:opacity-40"
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
