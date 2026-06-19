import * as dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
);

async function test() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt =
    'Is "Tennis" a real sport or athletic activity? Reply with only "yes" or "no".';
  const result = await model.generateContent(prompt);
  console.log("Raw output:", result.response.text());
  console.log(
    "Parsed:",
    result.response.text().trim().toLowerCase().startsWith("yes"),
  );
}

test().catch(console.error);
