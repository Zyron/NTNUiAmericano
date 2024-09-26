// pages/api/get-data.ts
import { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql";

// console.log("process.env.DATABASE_PASSWORD");
// console.log(process.env.DATABASE_PASSWORD);

const connection = mysql.createConnection({
  host: "ntnuitennis.no",
  user: process.env.DATABASE_USERNAME || "", // previous member of board
  password: process.env.DATABASE_PASSWORD || "", // power (a not o) + number 
  database: "tennisgr_web2",
});

connection.connect();

function shuffleArray(array: any[]): any[] {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {

  let dummy = [
    {"medlemsid":10669,"fornavn":"Lars","etternavn":"Føleide","mobil":"+47 98454499"},
    {"medlemsid":12197,"fornavn":"Anh","etternavn":"Nguyen Pham","mobil":"97904835"},
    {"medlemsid":12345,"fornavn":"Bob","etternavn":"Dahl","mobil":"99745767"},
    {"medlemsid":15678,"fornavn":"Alice","etternavn":"Dahl","mobil":"76894556"}
  ];

  try {
    const timeid = req.query.timeid;

    if (!timeid) {
      res.status(400).json({ error: "timeid not provided in the query" });
      return;
    }


    const results = await new Promise<any[]>((resolve, reject) => {
      connection.query('SELECT b.medlemsid, b.fornavn, b.etternavn, b.mobil FROM vikarer a, medlemmer b WHERE a.medlemsid = b.medlemsid AND a.timeid= ? ORDER BY a.bekreftelsestidspunkt', [timeid], (error, results, fields) => {
        if (error) {
          console.log(error);
          resolve(dummy); // resolve with dummy data on error
        } else {
          console.log(results);
          resolve(results);
        }
      });
    });

    // Check the length of the results
    if (results.length === 4 || results.length === 5 || results.length === 6) {
      console.log("test3");
      res.status(200).json(results);
    } else {
      console.log("test4");
      res.status(200).json(dummy);
    }
    
  } catch (error) {
    console.log("test5");
    res.status(500).json(dummy); // Return dummy data when an unexpected error occurs
  }
};

export default handler;