import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const SHEET_ID = process.env.SHEET_ID;
const API_KEY = process.env.GOOGLE_API_KEY;
const RANGE = 'Sheet2!B3:D4';

app.get("/budget", async (req, res) => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    const response = await fetch(url);

    const rawResponse = await response.text();

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch (err) {
      console.error("❌ Response not JSON. Here's what we got:\n", rawResponse);
      return res.status(500).json({ error: "Invalid response from Google API" });
    }

    if (!data.values) {
      console.error("❌ Google API returned error:", data);
      return res.status(500).json({ error: "No data received" });
    }

    return res.json({ values: data.values });
  } catch (error) {
    console.error("❌ Backend Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
