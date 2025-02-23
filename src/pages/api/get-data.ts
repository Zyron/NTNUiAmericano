// pages/api/get-data.ts
import { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql";
import { DateTime } from "luxon";

// Create a MySQL connection
const connection = mysql.createConnection({
  host: "ntnuitennis.no",
  user: process.env.DATABASE_USERNAME || "",
  password: process.env.DATABASE_PASSWORD || "",
  database: "tennisgr_web2",
});

connection.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection error:", err);
  } else {
    console.log("✅ MySQL connected.");
  }
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  let dummy = [
    { "medlemsid": 12679, "fornavn": "Lars", "etternavn": "Føleide", "mobil": "+47 99554455" },
    { "medlemsid": 12187, "fornavn": "Anh", "etternavn": "Nguyen", "mobil": "97104835" },
    { "medlemsid": 12375, "fornavn": "Bob", "etternavn": "Dylan", "mobil": "99745767" },
    { "medlemsid": 15668, "fornavn": "Alice", "etternavn": "Wonderland", "mobil": "46894556" }
  ];

  try {
    const { timeid, expiredonehour, spilletid } = req.query;

    if (!timeid) {
      return res.status(400).json({ error: "timeid is required." });
    }

    console.log("📩 Received params:", { timeid, expiredonehour, spilletid });

    // Ensure `timeid` is an integer
    const numericTimeId = parseInt(timeid as string, 10);
    if (isNaN(numericTimeId)) {
      return res.status(400).json({ error: "Invalid timeid format. Must be an integer." });
    }

    // Keep expiredOneHour as a string but ensure it's either "true" or "false"
    const isExpired = expiredonehour === "true" ? "true" : "false";

    // Validate and format `spilletid` correctly for MySQL
    let formattedSpilletid: string | null = null;

    if (spilletid) {
      console.log("📅 Received spilletid:", spilletid);

      const match = /^\d{8}T\d{2}:\d{2}:\d{2}$/.test(spilletid as string);
      if (!match) {
        return res.status(400).json({ error: "Invalid spilletid format. Expected YYYYMMDDTHH:MM:SS" });
      }

      // Convert to MySQL datetime format with correct timezone (Europe/Oslo)
      const eventTime = DateTime.fromFormat(spilletid as string, "yyyyMMdd'T'HH:mm:ss", { zone: "Europe/Oslo" });

      if (!eventTime.isValid) {
        return res.status(400).json({ error: "Failed to parse spilletid." });
      }

      formattedSpilletid = eventTime.toFormat("yyyy-MM-dd HH:mm:ss"); // MySQL datetime format
      console.log("✅ Parsed spilletid (MySQL format, fixed timezone):", formattedSpilletid);
    }

    // Prepare SQL query based on expiredOneHour flag
    let query = `
      SELECT b.medlemsid, b.fornavn, b.etternavn, b.mobil 
      FROM vikarer a
      INNER JOIN medlemmer b ON a.medlemsid = b.medlemsid
      WHERE a.timeid = ?
      ORDER BY a.bekreftelsestidspunkt`;

    let params: any[] = [numericTimeId];

    if (isExpired === "true" && formattedSpilletid) {
      query = `
        SELECT b.medlemsid, b.fornavn, b.etternavn, b.mobil 
        FROM siste_treninger a
        INNER JOIN medlemmer b ON a.medlemsid = b.medlemsid
        WHERE a.timeid = ? AND a.treningstidspunkt = ?`;
      params = [numericTimeId, formattedSpilletid];
    }

    console.log("📝 Executing SQL:", query);
    console.log("📊 With params:", params);

    const results = await new Promise<any[]>((resolve, reject) => {
      connection.query(query, params, (error, results) => {
        if (error) {
          console.error("❌ Database error:", error);
          resolve(dummy); // Return dummy data on error
        } else {
          resolve(results);
        }
      });
    });

    // Check player count, return results or dummy data
    if (results.length >= 4 && results.length <= 6) {
      return res.status(200).json(results);
    } else {
      return res.status(200).json(dummy);
    }

  } catch (error) {
    console.error("⚠️ Unexpected error:", error);
    return res.status(500).json(dummy); // Return dummy data on server error
  }
};

export default handler;