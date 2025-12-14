import fs from "fs";
import { LOGS_DIR, LOG_FILE } from "../utils/paths.js";
import { connectDB } from "../utils/mongo.js";

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

export async function logResult(
  filePath: string,
  fields: string[] | any,
  text: string,
  llmResult: any
) {
  const entryId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const entry = {
    id: entryId,
    timestamp: new Date().toISOString(),
    filePath,
    fields,
    ocrTextSnippet: text?.slice?.(0, 400),
    llmResult,
  };

  let logs: any[] = [];
  try {
    if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "[]");
    const raw = fs.readFileSync(LOG_FILE, "utf-8").trim() || "[]";
    logs = JSON.parse(raw);
  } catch {
    logs = [];
  }

  logs.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

  try {
    const db = await connectDB();
    const collection = db.collection("logs");
    await collection.insertOne(entry);
  } catch (err: any) {
    console.error("❌ Failed to save log to MongoDB:", err.message);
  }
}
