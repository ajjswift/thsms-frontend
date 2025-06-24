"use client";
import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { v4 as uuidv4 } from "uuid";
import useWebSocket from "@/hooks/useWebSocket";

export default function AdminPage() {
  const [uuid, setUuid] = useState(null);
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [jwt, setJwt] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const wsAuthed = useRef(false);
  const [intermission, setIntermission] = useState(false);
const [waiting, setWaiting] = useState(false);
const [takeItOff, setTakeItOff] = useState(false);

  // On mount, get or set UUID in cookie
  useEffect(() => {
    let stored = Cookies.get("voter_id");
    if (!stored) {
      stored = uuidv4();
      Cookies.set("voter_id", stored, { expires: 365 });
    }
    setUuid(stored);
  }, []);

  // On mount, get JWT from cookie
  useEffect(() => {
    const token = Cookies.get("admin_jwt");
    if (token) {
      setJwt(token);
      setAuth(true);
    }
  }, []);

  const toggleIntermission = () => send("toggle_intermission");
  const toggleWaiting = () => send("toggle_waiting");
  const toggleTakeItOff = () => send("toggle_take_it_off");
  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear all scores and reset everything?")) {
      send("clear_all");
    }
  };

  // WebSocket connection and event handling
  const { send, connected } = useWebSocket(
    process.env.NEXT_PUBLIC_SOCKET_URL,
    (event, data) => {
      if (event === "welcome") {
        setCurrentRound(data.currentRound);
        setLoading(false);
        setIntermission(data.intermission || false);
        setWaiting(data.waitingForNextRound || false);
        setTakeItOff(data.takeItOff || false);
        if (!data.isAdmin) {
          setAuth(false);
          setPwError("JWT expired or invalid. Please log in again.");
          Cookies.remove("admin_jwt");
        }
      }
      if (event === "state_update") {
        setIntermission(data.intermission);
        setWaiting(data.waitingForNextRound);
        setTakeItOff(data.takeItOff);
      }
      if (event === "round_update") {
        setCurrentRound(data.currentRound);
      }
      if (event === "error" && data.message === "Unauthorized") {
        setAuth(false);
        setPwError("Session expired. Please log in again.");
        Cookies.remove("admin_jwt");
      }
    }
  );

  // On connect, send identify event with UUID and JWT
  useEffect(() => {
    if (connected && uuid && auth && jwt && !wsAuthed.current) {
      send("identify", { uuid, token: jwt });
      wsAuthed.current = true;
    }
    if (!connected) {
      wsAuthed.current = false;
    }
    // eslint-disable-next-line
  }, [connected, uuid, auth, jwt]);

  // Handle password submit
  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        setPwError("Incorrect password.");
        return;
      }
      const { token } = await res.json();
      setJwt(token);
      setAuth(true);
      Cookies.set("admin_jwt", token, { expires: 7 }); // 7 days
    } catch (err) {
      setPwError("Network error.");
    }
  };

  // Admin action via WebSocket
  const nextRound = () => {
    send("next_round");
    waiting && toggleWaiting()
    intermission && toggleIntermission()
    takeItOff && toggleTakeItOff()
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <form
          className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg border border-gray-200"
          onSubmit={handlePwSubmit}
        >
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
            Admin
          </h1>
          <input
            type="password"
            className="w-full px-4 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Enter admin password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
          />
          {pwError && (
            <div className="text-red-600 text-sm mb-4 text-center">
              {pwError}
            </div>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold mb-8 text-center text-blue-700">
          Admin Panel
        </h1>
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="text-center mb-8">
              <span className="text-lg text-gray-700">Current Round: </span>
              <span className="font-bold text-blue-600 text-2xl">
                {currentRound + 1}
              </span>
            </div>
            <button
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={nextRound}
            >
              Next Round
            </button>
            <button
              className={`w-full px-6 py-3 rounded-lg font-semibold text-lg shadow transition mb-4 ${
                intermission
                  ? "bg-yellow-600 text-white hover:bg-yellow-700"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              }`}
              onClick={toggleIntermission}
            >
              {intermission ? "End Intermission" : "Start Intermission"}
            </button>
            <button
              className={`w-full px-6 py-3 rounded-lg font-semibold text-lg shadow transition mb-4 ${
                waiting
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
              }`}
              onClick={toggleWaiting}
            >
              {waiting ? "End Waiting" : "Start Waiting for Next Round"}
            </button>

            <button
              className={`w-full px-6 py-3 rounded-lg font-semibold text-lg shadow transition mb-4 ${
                takeItOff
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-red-100 text-red-800 hover:bg-red-200"
              }`}
              onClick={toggleTakeItOff}
            >
              {takeItOff ? "End 'Take it off!'" : "Show 'Take it off!'"}
            </button>

            <button
              className="w-full px-6 py-6 bg-red-600 text-white rounded-lg font-semibold text-lg shadow transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 mt-4"
              onClick={clearAll}
            >
              Clear Scores & Reset All
            </button>
            
          </>
        )}
      </div>
    </div>
  );
}
