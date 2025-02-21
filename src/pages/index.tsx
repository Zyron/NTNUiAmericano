import { GetServerSideProps, GetServerSidePropsResult } from "next";
import Container from "@/components/Container";
import { useState, useEffect } from "react";

interface Item {
    medlemsid: number;
    fornavn: string;
    etternavn: string;
}

interface HomeProps {
    data: Item[] | null;
    error: string | null;
}

interface Match {
    [index: number]: string[];
}

interface Player {
    id: number;
    name: string;
}

interface Round {
    team1: Player[];
    team2: Player[];
    bench: Player[];
}

const sendData = async (
    timeid: number,
    host: string,
    expiredonehour: string | null
): Promise<{ data: Item[] | null; error: string | null }> => {
    try {
        const apiUrl = new URL(`http://${host}/api/get-data`);
        apiUrl.searchParams.append("timeid", timeid.toString());
        if (expiredonehour) {
            apiUrl.searchParams.append("expiredonehour", expiredonehour);
        }

        const res = await fetch(apiUrl.toString());
        const data = await res.json();

        return {
            data,
            error: null,
        };
    } catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error.message : "An unknown error occurred",
        };
    }
};

export const getServerSideProps: GetServerSideProps<HomeProps> = async (context): Promise<GetServerSidePropsResult<HomeProps>> => {
    const host = context.req.headers.host || "localhost:3000";

    // Retrieve query parameters
    const { timeid, expiredonehour } = context.query;

    // Parse `timeid` as an integer with a default value of 999 if missing
    const timeidToSend = timeid ? parseInt(timeid as string, 10) : 999;

    // Ensure `expiredonehour` is a string ("0" or "1")
    const expiredOneHourParam = expiredonehour ? expiredonehour.toString() : null;

    // Fetch data using both `timeid` and `expiredonehour`
    const { data, error } = await sendData(timeidToSend, host, expiredOneHourParam);

    return {
        props: {
            data,
            error,
        },
    };
};


function shuffleArray(array: any[]) {
    return array
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
}

function generateRounds(players: Player[], lastBenchedPlayers?: Player[]): Round[] {
    console.log("🏓 Generating new rounds...");
    console.log("🔍 Last benched players:", lastBenchedPlayers?.map(p => p.name));

    let shuffledPlayers = shuffleArray([...players]);

    console.log("🔀 Initial shuffle:", shuffledPlayers.map(p => p.name));

    // Ensure last benched players get priority in round 1
    if (lastBenchedPlayers?.length) {
        shuffledPlayers = shuffledPlayers.filter(
            player => !lastBenchedPlayers.some(benched => benched.id === player.id)
        );
        shuffledPlayers = [...lastBenchedPlayers, ...shuffledPlayers]; // Move them to the front
        console.log("✅ Ensuring last benched players play in round 1:", shuffledPlayers.map(p => p.name));
    }

    // Generate rounds as before
    let rounds: Round[] = [];

    const numPlayers = shuffledPlayers.length;

    if (numPlayers === 4) {
        rounds = [
        { team1: [shuffledPlayers[0], shuffledPlayers[1]], team2: [shuffledPlayers[2], shuffledPlayers[3]], bench: [] },
        { team1: [shuffledPlayers[0], shuffledPlayers[2]], team2: [shuffledPlayers[1], shuffledPlayers[3]], bench: [] },
        { team1: [shuffledPlayers[0], shuffledPlayers[3]], team2: [shuffledPlayers[1], shuffledPlayers[2]], bench: [] },
        ];
    } else if (numPlayers === 5) {
        rounds = [
        { team1: [shuffledPlayers[1], shuffledPlayers[4]], team2: [shuffledPlayers[0], shuffledPlayers[2]], bench: [shuffledPlayers[3]] },
        { team1: [shuffledPlayers[1], shuffledPlayers[2]], team2: [shuffledPlayers[0], shuffledPlayers[3]], bench: [shuffledPlayers[4]] },
        { team1: [shuffledPlayers[0], shuffledPlayers[1]], team2: [shuffledPlayers[3], shuffledPlayers[4]], bench: [shuffledPlayers[2]] },
        { team1: [shuffledPlayers[1], shuffledPlayers[3]], team2: [shuffledPlayers[4], shuffledPlayers[2]], bench: [shuffledPlayers[0]] },
        { team1: [shuffledPlayers[0], shuffledPlayers[4]], team2: [shuffledPlayers[3], shuffledPlayers[2]], bench: [shuffledPlayers[1]] },
        ];
    } else if (numPlayers === 6) {
        rounds = [
        { team1: [shuffledPlayers[0], shuffledPlayers[1]], team2: [shuffledPlayers[2], shuffledPlayers[3]], bench: [shuffledPlayers[4], shuffledPlayers[5]] },
        { team1: [shuffledPlayers[4], shuffledPlayers[5]], team2: [shuffledPlayers[3], shuffledPlayers[1]], bench: [shuffledPlayers[0], shuffledPlayers[2]] },
        { team1: [shuffledPlayers[5], shuffledPlayers[1]], team2: [shuffledPlayers[2], shuffledPlayers[0]], bench: [shuffledPlayers[4], shuffledPlayers[3]] },
        { team1: [shuffledPlayers[4], shuffledPlayers[3]], team2: [shuffledPlayers[0], shuffledPlayers[5]], bench: [shuffledPlayers[2], shuffledPlayers[1]] },
        { team1: [shuffledPlayers[0], shuffledPlayers[4]], team2: [shuffledPlayers[2], shuffledPlayers[1]], bench: [shuffledPlayers[5], shuffledPlayers[3]] },
        { team1: [shuffledPlayers[5], shuffledPlayers[3]], team2: [shuffledPlayers[4], shuffledPlayers[1]], bench: [shuffledPlayers[0], shuffledPlayers[2]] },
        { team1: [shuffledPlayers[2], shuffledPlayers[4]], team2: [shuffledPlayers[0], shuffledPlayers[3]], bench: [shuffledPlayers[5], shuffledPlayers[1]] },
        { team1: [shuffledPlayers[1], shuffledPlayers[2]], team2: [shuffledPlayers[0], shuffledPlayers[5]], bench: [shuffledPlayers[3], shuffledPlayers[4]] },
        { team1: [shuffledPlayers[2], shuffledPlayers[5]], team2: [shuffledPlayers[3], shuffledPlayers[4]], bench: [shuffledPlayers[0], shuffledPlayers[1]] },
      ];
    }

    return rounds;
}

type Matchup = string[][][];

function formatMatchups(matchups: Round[]): string[][][] {
    let rounds: string[][][] = [];

    matchups.forEach((round, index) => {
        let roundText: string[][] = [];
        roundText.push([`Round ${index + 1}`]);

            if (
            round.team1.length > 0 &&
            round.team2.length > 0
            ) {
            roundText.push([`${round.team1[0].name}`, `${round.team2[0].name}`]);
            roundText.push([`${round.team1[1].name}`, `${round.team2[1].name}`]);
        }

        rounds.push(roundText);
    });

    return rounds;
}

const buttons = Array.from({ length: 17 }, (_, i) => i); // Create an array from 0 to 16

const Home: React.FC<HomeProps> = ({ data, error }) => {
    const [isClient, setIsClient] = useState(false);
    const [rounds, setRounds] = useState<string[][][]>([]);
    const [currentRound, setCurrentRound] = useState<number>(0);
    const [scores, setScores] = useState<{ [key: number]: [number, number] }>({});
    const [currentRanking, setCurrentRanking] = useState<[string, number][]>([]);
    const [previousRounds, setPreviousRounds] = useState<string[][][]>([]);
    
    // 1️⃣ Always set `isClient` first to avoid hydration errors
    useEffect(() => {
        setIsClient(true);
    }, []);

    // 2️⃣ Load `localStorage` values only in the browser
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedRounds = localStorage.getItem("rounds");
            if (savedRounds) setRounds(JSON.parse(savedRounds));

            const savedRound = localStorage.getItem("currentRound");
            if (savedRound) setCurrentRound(parseInt(savedRound, 10));

            const savedScores = localStorage.getItem("scores");
            if (savedScores) setScores(JSON.parse(savedScores));
        }
    }, []);

    // 🔹 Save `rounds` to localStorage only when necessary
    useEffect(() => {
        if (rounds.length > 0 && typeof window !== "undefined") {
            const existingRounds = localStorage.getItem("rounds");
            const parsedRounds = existingRounds ? JSON.parse(existingRounds) : null;
            if (JSON.stringify(parsedRounds) !== JSON.stringify(rounds)) {
                localStorage.setItem("rounds", JSON.stringify(rounds));
            }
        }
    }, [rounds]);

    // 🔹 Save `currentRound` to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("currentRound", currentRound.toString());
    }, [currentRound]);

    // 🔹 Save `scores` to localStorage whenever it changes
    useEffect(() => {
        if (Object.keys(scores).length > 0) {
            localStorage.setItem("scores", JSON.stringify(scores));
        }
    }, [scores]);

    // 🔹 Generate rounds when `data` changes
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedRounds = localStorage.getItem("rounds");
            if (savedRounds) {
                setRounds(JSON.parse(savedRounds)); // ✅ Load saved rounds
            } else if (data) {
                const players: Player[] = data.map(item => ({
                    id: item.medlemsid,
                    name: `${item.fornavn} ${item.etternavn[0]}.`
                }));
                const initialRounds = formatMatchups(generateRounds(players));
            setRounds(initialRounds);
            setPreviousRounds(initialRounds);
                localStorage.setItem("rounds", JSON.stringify(initialRounds)); // ✅ Save rounds
            }
        }
    }, [data]); // ✅ Only regenerate rounds if no saved rounds exist

    // 🔹 Calculate rankings when `scores` change
    useEffect(() => {
        const updatedScores = calculatePlayerScores();
        const sortedRanking = Object.entries(updatedScores).sort((a, b) => b[1] - a[1]);
        setCurrentRanking(sortedRanking);
    }, [scores]); // ✅ Fix: Add 'calculatePlayerScores' here

    // 🔹 Update scores and persist to `localStorage`
    const updateScores = (score: number) => {
        setScores((prevScores) => {
            const newScores: { [key: number]: [number, number] } = {
                ...prevScores,
                [currentRound]: [score, 16 - score], // ✅ Ensure strict `[number, number]` type
            };
            localStorage.setItem("scores", JSON.stringify(newScores)); // Save immediately
            return newScores;
        });
    };

    // 🔹 Move to next round
    const goToNextRound = () => {
        setCurrentRound((prevRound) => prevRound + 1);
    };

    // 🔹 Move to previous round
    const goToPrevRound = () => {
        setCurrentRound((prevRound) => prevRound - 1);
    };

    // 🔹 Handle errors
    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!data || !Array.isArray(data)) {
        return <div>Loading...</div>;
    }

    const round = rounds[currentRound] || []; // Get current round
    console.log(rounds);

    function calculatePlayerScores() {
        const playerScores: { [key: string]: number } = {};

        // Initialize scores for all players
        data?.forEach((item) => {
            playerScores[`${item.fornavn} ${item.etternavn[0]}.`] = 0;
        });

        // Iterate over each round and accumulate scores
        rounds.forEach((round, roundIndex) => {
            if (scores[roundIndex] && round[1] && round[2]) {
                const [score1, score2] = scores[roundIndex];
    
                // Ensure round[1] and round[2] are defined and have the expected structure
                if (round[1] && round[1][0] && round[2] && round[2][0]) {
                // Team 1: Player 0 from round[1] and Player 0 from round[2]
                const team1 = [round[1][0], round[2][0]];
    
                // Team 2: Player 1 from round[1] and Player 1 from round[2]
                const team2 = [round[1][1], round[2][1]];
    
                // Assign scores to players in team 1
                team1.forEach((player) => {
                    if (playerScores.hasOwnProperty(player)) {
                        playerScores[player] += score1; // Team 1 gets score1
                    }
                });
    
                // Assign scores to players in team 2
                team2.forEach((player) => {
                    if (playerScores.hasOwnProperty(player)) {
                        playerScores[player] += score2; // Team 2 gets score2
                    }
                });
            }
            }
        });
    
        return playerScores;
    }

    function areRoundsEqual(rounds1: any[][][], rounds2: any[][][]) {
        return JSON.stringify(rounds1) === JSON.stringify(rounds2);
    }

    function generateUniqueRounds(data: any[], previousRounds: any[][][]) {
        let newRounds: any[][][] = [];
        let attempts = 0;
    
        do {
            newRounds = formatMatchups(generateRounds(data)); // Generates with shuffled players and formats them
            attempts++;
        } while (areRoundsEqual(newRounds, previousRounds) && attempts < 10);  // Retry if same
    
        return newRounds;
    }

    const playerScores = calculatePlayerScores();
    const currentPlayerScores = calculatePlayerScores();

    // Sort players by score in descending order
    const sortedPlayers = Object.entries(playerScores)
        .sort((a, b) => b[1] - a[1]);

    function startNewGame() {
        if (!rounds.length) return;

        // Extract the last round safely
        const lastRound: Round | undefined = rounds[rounds.length - 1] as unknown as Round;

        // Ensure `lastBenchedPlayers` is extracted correctly
        const lastBenchedPlayers: Player[] = lastRound?.bench ? [...lastRound.bench] : [];

        console.log("🔄 Starting new game... Last benched:", lastBenchedPlayers.map(p => p.name));
        console.log("🔄 Starting new game... Player list:", data);

        if (!data || data.length === 0) return;

        const players: Player[] = data.map(item => ({
            id: item.medlemsid,
            name: `${item.fornavn} ${item.etternavn[0]}.`
        }));

        // ✅ Ensure `generateRounds` prioritizes benched players in the first round
        const newRounds = generateRounds(players, lastBenchedPlayers);
        setRounds(formatMatchups(newRounds));
        setCurrentRound(0);
        setScores({});
        setCurrentRanking([]);
    
        localStorage.setItem("rounds", JSON.stringify(newRounds));
        localStorage.removeItem("currentRound");
        localStorage.removeItem("scores");
    }

    if (!rounds.length) {
        return <div>Loading rounds...</div>;
    }
    
    return (
        <div className="bg-white">
            {!isClient ? (
                <div>Loading...</div> 
            ) : (
        <Container>
            {/* Title */}
            <p className="flex justify-center text-4xl text-black">Americano</p>
            
            {/* Subtitle: 16 poeng, 4 serve hver spiller */}
            <p className="flex justify-center text-lg text-gray-600 mt-2">(16 poeng, 4 serve hver spiller)</p>

            {/* Player List */}
            <div className="mt-5 flex justify-center">
                {/* Displaying players with numbers */}
                <div className="text-black">
                    {data.map((item, index) => (
                        <div key={`${item.fornavn}-${item.etternavn}`} className="mb-1">
                            <span className="font-bold">{index + 1}: </span>
                            {item.fornavn} {item.etternavn[0]}.
                        </div>
                    ))}
                </div>
            </div>
            <div className="text-center p-5">
                <div key={currentRound}>
                    <div className="grid grid-cols-3">
                        {/* Previous round button with stacked text and arrow */}
                        <div className="flex items-center justify-center">
                            {currentRound > 0 && (
                                <button
                                    className="flex flex-col items-center justify-center rounded-md border m-2 px-4 py-2 bg-blue-400 text-white w-32"
                                    onClick={goToPrevRound}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        fill="white"
                                        className="bi bi-arrow-left fill-3"
                                        viewBox="0 0 16 16"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
                                            stroke="white"
                                            strokeWidth="1"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Current round text */}
                        <div className="flex text-slate-700 font-bold text-2xl items-center justify-center">
                            Round {currentRound + 1}
                        </div>

                        {/* Next round button with stacked text and arrow */}
                        <div className="flex items-center justify-center">
                            {currentRound < rounds.length - 1 && (
                                <button
                                    className="flex flex-col items-center justify-center rounded-md border m-2 px-4 py-2 bg-blue-400 text-white w-32"
                                    onClick={goToNextRound}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        fill="white"
                                        className="bi bi-arrow-right"
                                        viewBox="0 0 16 16"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"
                                            stroke="white"
                                            strokeWidth="1"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <div className="bg-gray-100 rounded-md mb-4 max-w-3xl md:max-w-4xl flex items-center justify-between p-5 w-full">
                            <div className="flex-col">
                                {Array.isArray(round) && round.slice(1).map((match, matchIndex) => (
                                    <div key={matchIndex}>{match[0]}</div>
                                ))}
                            </div>
                            <div className="font-bold text-3xl">
                                {scores[currentRound] ? scores[currentRound][0] : 0} {/* Correct way to access Score 1 for the current round */}
                            </div>
                            {Array.isArray(round) && round.length > 1 && <div>vs</div>}
                            <div className="font-bold text-3xl">
                                {scores[currentRound] ? scores[currentRound][1] : 0} {/* Correct way to access Score 2 for the current round */}
                            </div>
                            <div className="flex flex-col">
                                {Array.isArray(round) && round.slice(1).map((match, matchIndex) => (
                                    <div key={matchIndex}>{match[1]}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap justify-center items-center">
                {buttons.map((button) => (
                    <button
                        key={button}
                        className="flex rounded-md w-12 border m-1 p-1 bg-gray-200 text-2xl font-semibold text-center justify-center items-center"
                        onClick={() => updateScores(button)} // Add an onClick handler here
                    >
                        {button}
                    </button>
                ))}
            </div>
            {currentRound === rounds.length - 1 && scores[currentRound] && (
                <div className="mt-10">
                    <h2 className="text-2xl font-bold text-center">High Scores</h2>
                    <div className="flex justify-center">
                        <table className="table-auto mt-4">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2">Rank</th>
                                    <th className="px-4 py-2">Player</th>
                                    <th className="px-4 py-2">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentRanking.map(([player, score], index) => (
                                    <tr key={player} className={index % 2 === 0 ? 'bg-gray-100' : ''}>
                                        <td className="border px-4 py-2">
                                            {index + 1} {index === 0 && "🏆"} {/* ✅ Trophy for 1st place */}
                                        </td>
                                        <td className="border px-4 py-2">{player}</td>
                                        <td className="border px-4 py-2">{score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* New Round Button */}
            <div className="flex justify-center mt-4">
                {currentRound === rounds.length - 1 && scores[currentRound] && (
                    <button
                        className="rounded-md border px-4 py-2 bg-green-500 text-white text-lg font-semibold"
                        onClick={startNewGame}
                    >
                        Start New Game
                    </button>
                )}
            </div>
        </Container>
        )}
        </div>
    );
};

export default Home;
