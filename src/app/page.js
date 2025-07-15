"use client";
import { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { v4 as uuidv4 } from "uuid";
import useWebSocket from "@/hooks/useWebSocket";
import Image from "next/image";
import { Inter } from "next/font/google";

function shuffle(array) {
    return array
        .map((a) => [Math.random(), a])
        .sort((a, b) => a[0] - b[0])
        .map((a) => a[1]);
}

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
    // 1. Get or set persistent UUID in cookie
    const [uuid, setUuid] = useState(null);
    useEffect(() => {
        let stored = Cookies.get("voter_id");
        if (!stored) {
            stored = uuidv4();
            Cookies.set("voter_id", stored, { expires: 365 });
        }
        setUuid(stored);
    }, []);

    const [contestants, setContestants] = useState([]);
    const [shuffledContestants, setShuffledContestants] = useState([]);
    const [currentRound, setCurrentRound] = useState(0);
    const [voteCounts, setVoteCounts] = useState({});
    const [myVote, setMyVote] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [intermission, setIntermission] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [takeItOff, setTakeItOff] = useState(false);

    // WebSocket connection and event handling
    const onEvent = useCallback(
        (event, data) => {
            if (event === "welcome") {
                setContestants(data.contestants);
                setCurrentRound(data.currentRound);
                setIntermission(data.intermission || false);
                setWaiting(data.waitingForNextRound || false);
                setTakeItOff(data.takeItOff || false);
                setLoading(false);
                send("get_my_vote", {});
                send("get_vote_counts", {});
            }
            if (event === "vote_update") {
                setVoteCounts(data.voteCounts || {});
            }
            if (event === "vote_success") {
                setMyVote(data.contestantId);
                setError("");
            }
            if (event === "state_update") {
                setIntermission(data.intermission);
                setWaiting(data.waitingForNextRound);
                setTakeItOff(data.takeItOff);
            }
            if (event === "vote_error" || event === "error") {
                setError(data.message);
            }
            if (event === "round_update") {
                setCurrentRound(data.currentRound);
                setMyVote(null);
                setError("");
                send("get_vote_counts", {});
                send("get_my_vote", {});
            }
            if (event === "reset_all") {
                setCurrentRound(data.currentRound || 0);
                setIntermission(data.intermission || false);
                setWaiting(data.waitingForNextRound || false);
                setTakeItOff(data.takeItOff || false);
                setVoteCounts({});
                setMyVote && setMyVote(null); // Only on voting page
            }
            if (event === "my_vote") {
                setMyVote(data.contestantId);
            }
        },
        // eslint-disable-next-line
        []
    );

    const { send, connected } = useWebSocket(
        process.env.NEXT_PUBLIC_SOCKET_URL,
        onEvent
    );

    // Identify on connect, only when uuid is ready
    useEffect(() => {
        if (connected && uuid) {
            send("identify", { uuid });
        }
        // eslint-disable-next-line
    }, [connected, uuid]);

    // Shuffle contestants on load
    useEffect(() => {
        if (contestants?.length > 0) {
            setShuffledContestants(shuffle(contestants));
        }
    }, [contestants]);

    const handleVote = (contestantId) => {
        send("vote", { contestantId });
    };

    if (loading || !uuid) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (takeItOff) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#7b0079] to-[#1d0029]">
                <div className="text-center">
                    <Image
                        src={"/take-it-off.png"}
                        className="animate-bounce"
                        width="791"
                        height="77"
                        alt="Take it off"
                    />
                </div>
            </div>
        );
    }
    if (intermission) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#7b0079] to-[#1d0029]">
                <div className="text-center">
                    <Image
                        src={"/intermission.png"}
                        className="w-full mb-4"
                        width="1428"
                        height="231"
                        alt="Intermission"
                    />
                    <p className="text-lg text-white">
                        We&apos;re now in Intermission. Check back later to
                        continue voting.
                    </p>
                </div>
            </div>
        );
    }
    if (waiting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#7b0079] to-[#1d0029]">
                <div className="text-center">
                    <Image
                        src={"/the-masked-singer.png"}
                        className="w-full mb-4"
                        width="1428"
                        height="231"
                        alt="Intermission"
                    />
                    <p className="text-lg text-white">
                        The next round will be starting soon
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen bg-gradient-to-b from-[#7b0079] to-[#1d0029] ${inter.className}`}
        >
            <div className="max-w-2xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <Image
                        alt="The Masked Singer Logo"
                        src={"/the-masked-singer.png"}
                        width="1428"
                        height="231"
                    />
                    <p className="text-gray-100 font-bold tracking-wide">
                        Round {currentRound + 1}
                    </p>
                </div>

                {/* Success message */}
                {myVote && (
                    <div className="bg-zinc-50 border rounded-lg p-4 mb-6">
                        <p className="text-[#7b0079] text-center">
                            Vote saved! It can be changed until the next round.
                        </p>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800 text-center">{error}</p>
                    </div>
                )}

                {/* Contestants */}
                {shuffledContestants.length > 0 ? (
                    <div className="space-y-4 mb-8">
                        {shuffledContestants.map((contestant) => {
                            const voteCount = voteCounts[contestant.id] || 0;
                            const isMyVote = myVote === contestant.id;

                            return (
                                <div
                                    key={contestant.id}
                                    className={`bg-white  p-6  border transition-all duration-200 hover:shadow-md ${
                                        isMyVote
                                            ? "border-green-700 bg-green-50 border-3 shadow-xl rounded-2xl"
                                            : "border-gray-200 rounded-sm shadow-sm"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                {contestant.name}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {voteCount} vote
                                                {voteCount !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                handleVote(contestant.id)
                                            }
                                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                                                isMyVote
                                                    ? "bg-green-600 text-white"
                                                    : "bg-[#ad1eaf] text-white hover:bg-[#7b0079]"
                                            }`}
                                        >
                                            {isMyVote ? "Voted" : "Vote"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">
                            No contestants available
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-[#fcd8ff] mt-12">
                    <span className="font-mono">{uuid}</span>
                </div>
            </div>
        </div>
    );
}
