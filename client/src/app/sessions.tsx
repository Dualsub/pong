"use client";

import { useCallback, useEffect, useState } from "react";
import { Session } from "./types";

const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://www.kurskollen.se/sessions")
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        console.log(res);
        throw new Error("Failed to fetch sessions");
      })
      .catch(() => [])
      .then((data) => {
        setSessions(data);
        setLoading(false);
      }).catch((err) => {
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
      {/* Nice table, with id, number of players (out of 2), and a join button(disabled if full)*/}
      <table className="table-auto mx-auto">
        <thead>
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Players</th>
            <th className="px-4 py-2">Join</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td className="border-none px-4 py-2">{session.id}</td>
              <td className="border-b px-4 py-2">{session.numPlayers}/2</td>
              <td className="border-b px-4 py-2">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full" disabled={session.numPlayers >= 2}>Join</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  }, [sessions, loading]);

  return (
    <div className="text-center">
      {renderSessions()}
    </div>
  );

};

export default Sessions;