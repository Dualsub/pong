"use client";

import { useCallback, useEffect, useState } from "react";
import { Session } from "./types";

const Sessions = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
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
            {sessions.map((session) => (
                <div key={session.id} className="flex flex-col justify-center text-center max-w-2xl text-white drop-shadow-md">
                    <h1 className="font-extrabold text-2xl mb-2">{session.id}</h1>
                    <p className="md:text-base text-sm">{session.numPlayers}</p>
                </div>
            ))}
        </>
    }, [sessions, loading]);

    return (
        <div>
            {renderSessions()}
        </div>
    );

};

export default Sessions;