"use client";

import { useCallback, useEffect, useState } from "react";
import { Session } from "./types";

const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([{ id: 1, numPlayers: 1 }]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/sessions", { mode: "cors" })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        console.log(res);
        throw new Error("Failed to fetch sessions");
      })
      .then((data) => {
        setSessions(data);
        setLoading(false);
      }).catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const renderSessions = useCallback(() => {
    if (loading) {
      return <p>Loading...</p>
    }

    if (sessions.length === 0) {
      return <p>No sessions found.</p>
    }

    return <>
      <h1 className="font-extrabold text-2xl mb-2 flex justify-center">Sessions</h1>
      {/* Nice table using grid, rounded with borders */}
      <div className="grid grid-cols-3 gap-4">
        {sessions.map((session) => (
          <a href={`/game?id=${session.id}`} key={session.id} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full flex-1 mx-auto block mb-10">
            {session.numPlayers} player{session.numPlayers > 1 ? "s" : ""}
          </a>
        ))}
      </div>
    </>
  }, [sessions, loading]);

  return (
    <div className="text-center">
      {renderSessions()}
    </div>
  );

};

export default Sessions;