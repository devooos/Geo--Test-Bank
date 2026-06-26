import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Search the web for the official multiple-choice questions and answers for Chapter 1 of 'Physical Geology Today' by Damian Nance and Brendan Murphy, published by Oxford University Press. Retrieve at least 15-20 questions. Return them as a JSON array.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    console.log("RESPONSE:", response.text);
  } catch (error) {
    console.error("ERROR:", error);
  }
}

test();
