"use client";

import { useCallback, useEffect, useState } from "react";
import { Session } from "./types";
import Link from "next/link";

const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://kurskollen.se/sessions")
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
      <table className="table-fixed w-full mx-auto">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Players</th>
            <th className="px-4 py-2">Join</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td className="border-b px-8 py-3">{session.id}</td>
              <td className="border-b px-8 py-3">{session.numPlayers}/2</td>
              <td className="border-b px-8 py-3">
                <Link
                  className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-1 px-3 rounded data-[disabled=true]:opacity-50 data-[disabled=true]:pointer-events-none w-fit"
                  data-disabled={session.numPlayers >= 2}
                  href={`/game?id=${session.id}`}
                >
                  Join
                </Link>
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