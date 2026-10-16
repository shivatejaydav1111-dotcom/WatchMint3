const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database(path.join(__dirname, "data", "app.db"));
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-admin-key";
const DEFAULT_REWARD = Number(process.env.COINS_PER_VIDEO || 10);

db.exec(`
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  reward INTEGER NOT NULL DEFAULT 10,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
  telegram_id TEXT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  coins INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS video_views (
  telegram_id TEXT NOT NULL,
  video_id INTEGER NOT NULL,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (telegram_id, video_id)
);
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function admin(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({error:"Unauthorized"});
  next();
}

app.get("/api/videos", (req,res) => {
  res.json(db.prepare("SELECT id,title,url,reward FROM videos WHERE active=1 ORDER BY id DESC").all());
});

app.get("/api/me", (req,res) => {
  const id = String(req.query.telegram_id || "demo");
  const user = db.prepare("SELECT * FROM users WHERE telegram_id=?").get(id);
  res.json(user || {telegram_id:id, username:"demo", first_name:"Demo User", coins:0});
});

app.post("/api/user", (req,res) => {
  const {telegram_id, username="", first_name=""} = req.body || {};
  if (!telegram_id) return res.status(400).json({error:"telegram_id required"});
  db.prepare(`INSERT INTO users(telegram_id,username,first_name) VALUES(?,?,?)
    ON CONFLICT(telegram_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name`)
    .run(String(telegram_id), username, first_name);
  res.json({ok:true});
});

// Demo-safe reward endpoint. Replace with verified ad/video completion logic before production payouts.
app.post("/api/complete", (req,res) => {
  const {telegram_id, video_id} = req.body || {};
  if (!telegram_id || !video_id) return res.status(400).json({error:"missing fields"});
  const video = db.prepare("SELECT * FROM videos WHERE id=? AND active=1").get(video_id);
  if (!video) return res.status(404).json({error:"Video not found"});
  const exists = db.prepare("SELECT 1 FROM video_views WHERE telegram_id=? AND video_id=?").get(String(telegram_id), video_id);
  if (exists) return res.status(409).json({error:"Already rewarded for this video"});
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO video_views(telegram_id,video_id) VALUES(?,?)").run(String(telegram_id), video_id);
    db.prepare("UPDATE users SET coins=coins+? WHERE telegram_id=?").run(video.reward, String(telegram_id));
  });
  tx();
  res.json({ok:true, reward:video.reward});
});

app.get("/admin", (req,res) => res.sendFile(path.join(__dirname,"public","admin.html")));

app.get("/api/admin/videos", admin, (req,res) => {
  res.json(db.prepare("SELECT * FROM videos ORDER BY id DESC").all());
});

app.post("/api/admin/videos", admin, (req,res) => {
  const {title,url,reward=DEFAULT_REWARD} = req.body || {};
  if (!title || !url) return res.status(400).json({error:"title and url required"});
  const result = db.prepare("INSERT INTO videos(title,url,reward) VALUES(?,?,?)")
    .run(title, url, Number(reward));
  res.json({ok:true,id:result.lastInsertRowid});
});

app.patch("/api/admin/videos/:id", admin, (req,res) => {
  const {title,url,reward,active} = req.body || {};
  db.prepare("UPDATE videos SET title=COALESCE(?,title), url=COALESCE(?,url), reward=COALESCE(?,reward), active=COALESCE(?,active) WHERE id=?")
    .run(title ?? null, url ?? null, reward ?? null, active ?? null, req.params.id);
  res.json({ok:true});
});

app.delete("/api/admin/videos/:id", admin, (req,res) => {
  db.prepare("DELETE FROM videos WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
