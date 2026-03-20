import { useState, useRef, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'ai', text: 'Hi! I am the LifeLine assistant. Ask me about blood donation.' }
    ]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const sendMessage = async (e) => {
        e.preventDefault();
        const userText = input.trim();
        if (!userText || isTyping) return;

        setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userText })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const serverMessage = data?.message || data?.reply || 'Chat request failed';
                throw new Error(serverMessage);
            }

            const aiReply = data?.reply || 'Sorry, I could not respond right now.';
            setMessages((prev) => [...prev, { sender: 'ai', text: aiReply }]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { sender: 'ai', text: error?.message || 'Sorry, I could not reach the assistant. Please try again.' }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            {isOpen && (
                <div style={styles.chatWindow}>
                    <div style={styles.header}>LifeLine Assistant</div>
                    <div style={styles.messages}>
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                style={{
                                    ...styles.messageBubble,
                                    ...(message.sender === 'user' ? styles.userBubble : styles.aiBubble)
                                }}
                            >
                                {message.text}
                            </div>
                        ))}
                        {isTyping && <div style={{ ...styles.messageBubble, ...styles.aiBubble }}>Typing...</div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={sendMessage} style={styles.inputRow}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about donation..."
                            style={styles.input}
                        />
                        <button type="submit" style={styles.sendButton} disabled={isTyping}>
                            Send
                        </button>
                    </form>
                </div>
            )}
            <button style={styles.fab} onClick={() => setIsOpen((prev) => !prev)}>
                {isOpen ? 'Close' : 'Chat'}
            </button>
        </div>
    );
}

const styles = {
    wrapper: {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999
    },
    fab: {
        background: '#c1121f',
        color: '#ffffff',
        border: 'none',
        borderRadius: '999px',
        padding: '12px 20px',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(193, 18, 31, 0.35)'
    },
    chatWindow: {
        width: '340px',
        height: '460px',
        background: '#ffffff',
        border: '1px solid #f3c7cc',
        borderRadius: '16px',
        boxShadow: '0 14px 30px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        marginBottom: '12px'
    },
    header: {
        background: 'linear-gradient(135deg, #c1121f, #9d0208)',
        color: '#ffffff',
        fontWeight: 700,
        padding: '12px 16px'
    },
    messages: {
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        background: '#fff5f5'
    },
    messageBubble: {
        maxWidth: '85%',
        padding: '10px 12px',
        borderRadius: '12px',
        marginBottom: '8px',
        lineHeight: 1.35,
        fontSize: '14px'
    },
    userBubble: {
        marginLeft: 'auto',
        background: '#c1121f',
        color: '#ffffff'
    },
    aiBubble: {
        marginRight: 'auto',
        background: '#ffffff',
        color: '#4b0f12',
        border: '1px solid #f0cdd1'
    },
    inputRow: {
        display: 'flex',
        gap: '8px',
        borderTop: '1px solid #f0cdd1',
        padding: '10px',
        background: '#ffffff'
    },
    input: {
        flex: 1,
        border: '1px solid #f0cdd1',
        borderRadius: '10px',
        padding: '10px',
        outline: 'none'
    },
    sendButton: {
        border: 'none',
        borderRadius: '10px',
        padding: '10px 12px',
        background: '#c1121f',
        color: '#ffffff',
        fontWeight: 600,
        cursor: 'pointer'
    }
};

export default Chatbot;
