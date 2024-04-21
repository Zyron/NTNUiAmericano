// pages/index.tsx
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
    number: number
): Promise<{ data: Item[] | null; error: string | null }> => {
    try {
        const res = await fetch(
            `http://localhost:3000/api/get-data?number=${number}`
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

    console.log(players);

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

    console.log(rounds);

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

export const getServerSideProps: GetServerSideProps<
    HomeProps
> = async (): Promise<GetServerSidePropsResult<HomeProps>> => {
    const numberToSend = 107; // 76; // Replace with the desired number
    const { data, error } = await sendData(numberToSend);

    return {
        props: {
            data,
            error,
        },
    };
};

const Home: React.FC<HomeProps> = ({ data, error }) => {
    const [currentRound, setCurrentRound] = useState(0); // State for current round
    const [scores, setScores] = useState<[number, number]>([0, 0]); // State for the scores

    const goToNextRound = () => {
        setCurrentRound((prevRound) => prevRound + 1);
    };
    const goToPrevRound = () => {
        setCurrentRound((prevRound) => prevRound - 1);
    };

    const updateScores = (score: number) => {
        setScores([score, 16 - score]); // Update the scores state
    };

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!data || !Array.isArray(data)) {
        return <div>Loading...</div>;
    }

    const rounds = formatMatchups(generateRounds(data));
    const round = rounds[currentRound]; // Get current round

    return (
        <Container>
            <p className="flex justify-center text-4xl text-black">Americano</p>

            <div className="mt-5 flex justify-center">
                <p className="font-bold text-black">Spillere: &nbsp;</p>
                {data.map((item) => (
                    <div key={`${item.fornavn}-${item.etternavn}`}>
                        {item.fornavn} {item.etternavn[0]}. &nbsp;
                    </div>
                ))}
            </div>
            <div className="text-center p-5">
                <div key={currentRound}>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            {currentRound > 0 && (
                                <button onClick={goToPrevRound}>{"<"}</button>
                            )}
                        </div>
                        <div className="text-slate-700 font-bold mb-2">
                            {round[0][0]}
                        </div>
                        <div>
                            {currentRound < rounds.length - 1 && (
                                <button onClick={goToNextRound}>{">"}</button>
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
                                {scores[0]}{/* Score 1 */}
                            </div>
                            {round.length > 1 && <div>vs</div>}
                            <div className="font-bold text-xl">{scores[1]}</div> {/* Score 2 i fet tekst */}
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

            <div className="mt-4">
            <p>Score 1: {scores[0]}</p> {/* Display the scores here */}
            <p>Score 2: {scores[1]}</p>
            </div>
        </Container>
    );
};

export default Home;
