import { useEffect, useRef, useState, useCallback } from "react";

export default function useWebSocket(url, onEvent) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket = new window.WebSocket(url);

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);

    socket.onmessage = (msg) => {
      try {
        const { event, data } = JSON.parse(msg.data);
        if (onEvent) onEvent(event, data);
      } catch (e) {
        // ignore
      }
    };

    ws.current = socket;

    return () => {
      socket.close();
    };
    // eslint-disable-next-line
  }, [url]);

  const send = useCallback((event, data) => {
    if (ws.current && ws.current.readyState === 1) {
      ws.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  return { send, connected };
}
