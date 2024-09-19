import { GetServerSideProps, GetServerSidePropsResult } from "next";
import Container from "@/components/Container";
import Link from "next/link";
import { useState } from "react";

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

const sendData = async (
    timeid: number
): Promise<{ data: Item[] | null; error: string | null }> => {
    try {
        const res = await fetch(
            `http://localhost:3000/api/get-data?timeid=${timeid}`
        );
        const data = await res.json();

        return {
            data,
            error: null,
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "An unknown error occurred";
        return {
            data: null,
            error: errorMessage,
        };
    }
};

function generateRounds(data: any[]): any[][][] {
    let numPlayers = data.length;

    let players = data.map(
        (item) => item.fornavn + " " + item.etternavn[0] + "."
    );

    let rounds: any[][][] = [];

    if (numPlayers === 4) {
        rounds = [
            [[players[0], players[1]], [players[2], players[3]], []],
            [[players[0], players[2]], [players[1], players[3]], []],
            [[players[0], players[3]], [players[1], players[2]], []],
        ];
    } else {
        for (let i = 0; i < numPlayers; i++) {
            let round: any[][] = [[], [], []];
            for (let j = 0; j < 4; j++) {
                let playerIndex = (i + j) % numPlayers;
                if (j < 2) {
                    round[0].push(players[playerIndex]);
                } else {
                    round[1].push(players[playerIndex]);
                }
            }
            round[2] = players.filter(
                (player: any) => ![...round[0], ...round[1]].includes(player)
            );
            rounds.push(round);
        }
    }

    return rounds;
}

type Matchup = string[][][];

function formatMatchups(matchups: Matchup): string[][][] {
    let rounds: string[][][] = [];

    matchups.forEach((round, index) => {
        let roundText: string[][] = [];
        roundText.push([`Round ${index + 1}`]);

        for (let i = 0; i < round.length; i += 2) {
            if (
                round[i].length > 0 &&
                round[i + 1] &&
                round[i + 1].length > 0
            ) {
                roundText.push([`${round[i][0]}`, `${round[i + 1][0]}`]);
                roundText.push([`${round[i][1]}`, `${round[i + 1][1]}`]);
            }
        }

        rounds.push(roundText);
    });

    return rounds;
}

const buttons = Array.from({ length: 17 }, (_, i) => i); // Create an array from 0 to 16

export const getServerSideProps: GetServerSideProps<HomeProps> = async (context): Promise<GetServerSidePropsResult<HomeProps>> => {
    // Log the full query object to debug
    // console.log("Query parameters:", context.query);

    // Retrieve the 'timeid' query parameter from the context
    const { timeid } = context.query;

    // Parse 'timeid' into an integer (or fallback to 165 if not provided)
    const timeidToSend = timeid ? parseInt(timeid as string, 10) : 165;

    // Log the timeid to be sent to the API for debugging
    // console.log("timeid to send:", timeidToSend);

    // Send the timeid in the request
    const { data, error } = await sendData(timeidToSend);

    // Log the API response data and any error for debugging
    // console.log("API Response:", data, error);

    return {
        props: {
            data,
            error,
        },
    };
};

const Home: React.FC<HomeProps> = ({ data, error }) => {
    const [currentRound, setCurrentRound] = useState(0); // State for current round
    const [scores, setScores] = useState<{ [key: number]: [number, number] }>({}); // Dictionary for storing scores for each round

    const goToNextRound = () => {
        setCurrentRound((prevRound) => prevRound + 1);
    };
    const goToPrevRound = () => {
        setCurrentRound((prevRound) => prevRound - 1);
    };

    const updateScores = (score: number) => {
        setScores((prevScores) => ({
            ...prevScores,
            [currentRound]: [score, 16 - score], // Update the scores for the current round
        }));
    };

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!data || !Array.isArray(data)) {
        return <div>Loading...</div>;
    }

    const rounds = formatMatchups(generateRounds(data));
    const round = rounds[currentRound]; // Get current round

    // Calculate total points for each player
    const calculatePlayerScores = () => {
        const playerScores: { [key: string]: number } = {};

        data.map((item) => (playerScores[`${item.fornavn} ${item.etternavn}`]=0));

        console.log(playerScores);

        // Iterate over each round and accumulate scores
        rounds.forEach((round, roundIndex) => {
            if (scores[roundIndex]) {
                const [score1, score2] = scores[roundIndex];
                round.slice(1).forEach((match, matchIndex) => {
                    if (match[0]) {
                        playerScores[match[0]] = (playerScores[match[0]] || 0) + (matchIndex === 0 ? score1 : score2);
                    }
                    if (match[1]) {
                        playerScores[match[1]] = (playerScores[match[1]] || 0) + (matchIndex === 0 ? score2 : score1);
                    }
                });
            }
        });

        return playerScores;
    };

    const playerScores = calculatePlayerScores();

    return (
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
                    <div className="grid grid-cols-3 gap-4">
                        {/* Previous round button with stacked text and arrow */}
                        <div className="flex items-center justify-center">
                            {currentRound > 0 && (
                                <button
                                    className="flex flex-col items-center justify-center rounded-md border m-2 px-4 py-2 bg-blue-400 text-white w-32"
                                    onClick={goToPrevRound}
                                >
                                    <span className="text-white">Previous</span>
                                    <span className="text-white">round</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        fill="white"
                                        className="bi bi-arrow-left mt-1"
                                        viewBox="0 0 16 16"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Current round text */}
                        <div className="text-slate-700 font-bold text-2xl">
                            Round {currentRound + 1}
                        </div>

                        {/* Next round button with stacked text and arrow */}
                        <div className="flex items-center justify-center">
                            {currentRound < rounds.length - 1 && (
                                <button
                                    className="flex flex-col items-center justify-center rounded-md border m-2 px-4 py-2 bg-blue-400 text-white w-32"
                                    onClick={goToNextRound}
                                >
                                    <span className="text-white">Next</span>
                                    <span className="text-white">round</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        fill="white"
                                        className="bi bi-arrow-right mt-1"
                                        viewBox="0 0 16 16"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <div className="bg-gray-100 rounded-md mb-4 max-w-md md:max-w-lg flex items-center justify-between p-5 w-4/5">
                            <div className="flex-col">
                                {round.slice(1).map((match, matchIndex) => (
                                    <div key={matchIndex}>{match[0]}</div>
                                ))}
                            </div>
                            <div className="font-bold text-xl">
                                {scores[currentRound] ? scores[currentRound][0] : 0} {/* Correct way to access Score 1 for the current round */}
                            </div>
                            {round.length > 1 && <div>vs</div>}
                            <div className="font-bold text-xl">
                                {scores[currentRound] ? scores[currentRound][1] : 0} {/* Correct way to access Score 2 for the current round */}
                            </div>
                            <div className="flex flex-col">
                                {round.slice(1).map((match, matchIndex) => (
                                    <div key={matchIndex}>{match[1]}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap justify-center">
                {buttons.map((button) => (
                    <button
                        key={button}
                        className="rounded-md w-12 border m-2 px-4 py-2 bg-gray-100"
                        onClick={() => updateScores(button)} // Add an onClick handler here
                    >
                        {button}
                    </button>
                ))}
            </div>
        </Container>
    );
};

export default Home;
