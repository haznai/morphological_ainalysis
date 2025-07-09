import { Database } from "@db/sqlite";

const db = new Database("zwicky_boxes.db");

// Initialize database
db.prepare(`
  CREATE TABLE IF NOT EXISTS zwicky_boxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

export interface ZwickyBoxData {
  columns: string[];
  rows: string[][];
}

export interface ZwickyBoxRecord {
  id: number;
  data: ZwickyBoxData;
  updated_at: string;
}

export function getLatestBox(): ZwickyBoxRecord | null {
  const row = db.prepare("SELECT id, data, updated_at FROM zwicky_boxes ORDER BY id DESC LIMIT 1").get();
  if (!row) return null;
  
  // SQLite returns an object with column names as keys
  const result = row as { id: number; data: string; updated_at: string };
  
  return {
    id: result.id,
    data: JSON.parse(result.data),
    updated_at: result.updated_at
  };
}

export function saveBox(data: ZwickyBoxData): number {
  const result = db.prepare("INSERT INTO zwicky_boxes (data) VALUES (?)").run(JSON.stringify(data));
  return (result as any).lastInsertRowid as number;
}

export function updateBox(id: number, data: ZwickyBoxData): void {
  db.prepare("UPDATE zwicky_boxes SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(JSON.stringify(data), id);
}

export function closeDb() {
  db.close();
}