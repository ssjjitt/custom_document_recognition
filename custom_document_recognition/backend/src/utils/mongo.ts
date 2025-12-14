import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

let db: any;

export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.MONGO_DB); 
    console.log("Connected to MongoDB");
  }
  return db;
}
