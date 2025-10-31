import { useEffect, useRef, useState } from 'react';
import { connectWS } from './Ws';

export default function App() {
    const timer = useRef(null);
    const socket = useRef(null);
    const [userName, setUserName] = useState('');
    const [showNamePopup, setShowNamePopup] = useState(true);
    const [inputName, setInputName] = useState('');
    const [typers, setTypers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');

    useEffect(() => {
        socket.current = connectWS();

        socket.current.on('connect', () => {
            socket.current.on('roomNotice', (userName) => {
                console.log(`${userName} joined to group!`);
            });

            socket.current.on('chatMessage', (msg) => {
                setMessages((prev) => [...prev, msg]);
            });

            socket.current.on('typing', (userName) => {
                setTypers((prev) => {
                    const isExist = prev.find((typer) => typer === userName);
                    if (!isExist) return [...prev, userName];
                    return prev;
                });
            });

            socket.current.on('stopTyping', (userName) => {
                setTypers((prev) => prev.filter((typer) => typer !== userName));
            });
        });

        return () => {
            socket.current.off('roomNotice');
            socket.current.off('chatMessage');
            socket.current.off('typing');
            socket.current.off('stopTyping');
        };
    }, []);

    useEffect(() => {
        if (text) {
            socket.current.emit('typing', userName);
            clearTimeout(timer.current);
        }

        timer.current = setTimeout(() => {
            socket.current.emit('stopTyping', userName);
        }, 1000);

        return () => clearTimeout(timer.current);
    }, [text, userName]);

    function formatTime(ts) {
        const d = new Date(ts);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    function handleNameSubmit(e) {
        e.preventDefault();
        const trimmed = inputName.trim();
        if (!trimmed) return;
        socket.current.emit('joinRoom', trimmed);
        setUserName(trimmed);
        setShowNamePopup(false);
    }

    function sendMessage() {
        const t = text.trim();
        if (!t) return;

        const msg = {
            id: Date.now(),
            sender: userName,
            text: t,
            ts: Date.now(),
        };
        setMessages((m) => [...m, msg]);
        socket.current.emit('chatMessage', msg);
        setText('');
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-green-200 to-green-300 font-inter p-4">
            {/* Name popup */}
            {showNamePopup && (
                <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/20 z-40">
                    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
                        <h1 className="text-2xl font-bold text-green-600">👋 Welcome!</h1>
                        <p className="text-gray-600 text-sm mt-2 mb-4">
                            Enter your name to start chatting in realtime
                        </p>
                        <form onSubmit={handleNameSubmit} className="space-y-4">
                            <input
                                autoFocus
                                value={inputName}
                                onChange={(e) => setInputName(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Your name (e.g. John Doe)"
                            />
                            <button
                                type="submit"
                                className="w-full py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition"
                            >
                                Continue
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Chat UI */}
            {!showNamePopup && (
                <div className="w-full max-w-2xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-green-600 text-white">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold uppercase">
                                {userName.charAt(0)}
                            </div>
                            <div>
                                <div className="font-semibold text-white">
                                    Realtime Group Chat
                                </div>
                                {typers.length ? (
                                    <div className="text-xs text-white/80 animate-pulse">
                                        {typers.join(', ')} typing...
                                    </div>
                                ) : (
                                    <div className="text-xs text-white/60">Online</div>
                                )}
                            </div>
                        </div>
                        <div className="text-sm font-medium">
                            {userName}
                        </div>
                    </div>

                    {/* Chat body */}
                    <div className="flex-1 bg-gray-50 overflow-y-auto px-4 py-4 space-y-2">
                        {messages.map((m) => {
                            const mine = m.sender === userName;
                            return (
                                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`relative px-4 py-2 rounded-2xl max-w-[75%] shadow-sm ${
                                            mine
                                                ? 'bg-green-500 text-white rounded-br-none'
                                                : 'bg-white text-gray-800 rounded-bl-none'
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap break-words text-sm">
                                            {m.text}
                                        </div>
                                        <div className="flex justify-between items-center mt-1 text-[11px] opacity-80">
                                            <span className="font-medium">{m.sender}</span>
                                            <span>{formatTime(m.ts)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-200">
                        <div className="flex items-center bg-gray-100 rounded-full px-3 py-2">
                            <textarea
                                rows={1}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                className="flex-1 resize-none bg-transparent outline-none text-sm px-3 py-1"
                            />
                            <button
                                onClick={sendMessage}
                                className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-full text-sm font-semibold transition"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
