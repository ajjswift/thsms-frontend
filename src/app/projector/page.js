"use client";
import { useEffect, useState, useCallback } from "react";
import useWebSocket from "@/hooks/useWebSocket";

export default function Projector() {
  const [uuid] = useState("projector-uuid-12345");
  const [contestants, setContestants] = useState([]);
  const [voteCounts, setVoteCounts] = useState({});
  const [currentRound, setCurrentRound] = useState(0);
  const [loading, setLoading] = useState(true);

  // WebSocket connection and event handling
  const onEvent = useCallback((event, data) => {
    if (event === "welcome") {
      setContestants(data.contestants);
      setCurrentRound(data.currentRound);
      setLoading(false);
      send("get_vote_counts");
    }
    if (event === "vote_update") {
      setVoteCounts(data.voteCounts || {});
    }
    if (event === "round_update") {
      setCurrentRound(data.currentRound);
      send("get_vote_counts");
    }
  }, []);

  const { send, connected } = useWebSocket(
    "ws://localhost:8080",
    onEvent
  );

  // On connect, send identify event with UUID
  useEffect(() => {
    if (connected && uuid) {
      send("identify", { uuid });
    }
    // eslint-disable-next-line
  }, [connected, uuid]);

  // Calculate total votes
  const totalVotes = Object.values(voteCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // Sort contestants by percentage descending
  const sortedContestants = [...contestants].sort((a, b) => {
    const aVotes = voteCounts[a.id] || 0;
    const bVotes = voteCounts[b.id] || 0;
    return bVotes - aVotes;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Live Voting Results
          </h1>
          <p className="text-gray-600">Round {currentRound + 1}</p>
        </div>

        {/* Results */}
        {sortedContestants.length > 0 ? (
          <div className="space-y-4">
            {sortedContestants.map((contestant, index) => {
              const voteCount = voteCounts[contestant.id] || 0;
              const percent =
                totalVotes > 0
                  ? Math.round((voteCount / totalVotes) * 100)
                  : 0;
              const isLeader = index === 0 && voteCount > 0;

              return (
                <div
                  key={contestant.id}
                  className={`bg-white rounded-xl p-6 shadow-sm border transition-all duration-300 ${
                    isLeader
                      ? "border-yellow-300 bg-yellow-50 shadow-md"
                      : "border-gray-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isLeader
                            ? "bg-yellow-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {contestant.name}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-3xl font-bold ${
                          isLeader ? "text-yellow-600" : "text-gray-700"
                        }`}
                      >
                        {percent}%
                      </div>
                    </div>
                  </div>
                  {/* Optional: Add a progress bar */}
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isLeader ? "bg-yellow-400" : "bg-blue-400"
                      }`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200">
              <p className="text-gray-500 text-lg">No results available yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Waiting for contestants and votes...
              </p>
            </div>
          </div>
        )}

        
      </div>
    </div>
  );
}
