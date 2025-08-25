import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

/* ---------- helpers ---------- */
const YT_REGEXES = [
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
];
const SPOTIFY_REGEX = /open\.spotify\.com\/(track|album|playlist|episode|show)\/([\w-]+)/i;

function parseMedia(url) {
  try {
    const u = new URL(url);
    const href = u.href;

    // YouTube
    for (const rx of YT_REGEXES) {
      const m = href.match(rx);
      if (m) {
        const id = u.searchParams.get("v") || m[1];
        if (id) {
          return {
            provider: "youtube",
            id,
            embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
            titleHint: "YouTube video",
          };
        }
      }
    }

    // Spotify
    const sm = href.match(SPOTIFY_REGEX);
    if (sm) {
      const type = sm[1];
      const id = sm[2];
      return {
        provider: "spotify",
        id,
        type,
        embed: `https://open.spotify.com/embed/${type}/${id}`,
        titleHint: `Spotify ${type}`,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

const STORAGE_KEY = "bday_playlist_items_v1";
const loadItems = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const saveItems = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/* ---------- component ---------- */
export default function App() {
  const [items, setItems] = useState(loadItems);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const addItem = () => {
    const meta = parseMedia(url.trim());
    if (!meta) {
      alert("Please paste a valid YouTube or Spotify link.");
      return;
    }
    const item = {
      id: uuid(),
      url: url.trim(),
      provider: meta.provider,
      type: meta.type || null,
      refId: meta.id,
      embed: meta.embed,
      titleHint: meta.titleHint,
      note: note.trim(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      favorite: false,
    };
    setItems([item, ...items]);
    setUrl("");
    setNote("");
    setName("");
  };

  const removeItem = (id) => setItems(items.filter((x) => x.id !== id));
  const toggleFav = (id) =>
    setItems(items.map((x) => (x.id === id ? { ...x, favorite: !x.favorite } : x)));
  const updateNote = (id, newNote) =>
    setItems(items.map((x) => (x.id === id ? { ...x, note: newNote } : x)));
  const updateName = (id, newName) =>
    setItems(items.map((x) => (x.id === id ? { ...x, name: newName } : x)));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "birthday-playlist.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) setItems(data);
        else alert("Invalid file format");
      } catch {
        alert("Could not read file.");
      }
    };
    reader.readAsText(file);
  };

  const filtered = useMemo(() => {
    if (filter === "fav") return items.filter((x) => x.favorite);
    if (filter === "yt") return items.filter((x) => x.provider === "youtube");
    if (filter === "sp") return items.filter((x) => x.provider === "spotify");
    return items;
  }, [items, filter]);

  const small = { fontSize: 12, color: "#666" };
  const row = { display: "flex", gap: 12, flexWrap: "wrap" };
  const col = { flex: 1, minWidth: 220 };
  const divider = { height: 1, background: "#eee", margin: "16px 0" };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
      }}
    >
      <div className="app-card">
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>🎵</span>
          <h1 className="app-title">Happy Birthday Playlist</h1>
        </div>
        <p style={small}>
          Add YouTube or Spotify links with your own notes. Everything saves to this browser (no login).
        </p>

        {/* add form */}
        <div style={{ ...divider, marginTop: 12 }} />
        <div style={{ ...row, marginBottom: 8 }}>
          <input
            style={{ ...col, padding: "12px 14px" }}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube or Spotify link"
          />
          <button onClick={addItem} className="primary">Add to Playlist</button>
        </div>
        <div style={row}>
          <input
            style={{ ...col, padding: "12px 14px" }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional title (e.g., Our first trip)"
          />
          <input
            style={{ ...col, padding: "12px 14px" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a personal note (optional)"
          />
        </div>

        {/* filters + export/import */}
        <div style={{ ...row, alignItems: "center", marginTop: 14 }}>
          <span style={small}>Filter:&nbsp;</span>
          <button onClick={() => setFilter("all")} className="chip">All</button>
          <button onClick={() => setFilter("fav")} className="chip">⭐ Favorites</button>
          <button onClick={() => setFilter("yt")} className="chip">YouTube</button>
          <button onClick={() => setFilter("sp")} className="chip">Spotify</button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={exportJson}>Export</button>
            <label className="input-like" style={{
              display: "inline-flex", alignItems: "center",
              padding: "0 14px", border: "1px solid #e8e8e8",
              background: "#fff", borderRadius: "10px", cursor: "pointer"
            }}>
              Import
              <input
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => e.target.files && importJson(e.target.files[0])}
              />
            </label>
          </div>
        </div>

        {/* list */}
        <div style={{ ...divider, marginTop: 12 }} />
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
          {filtered.map((it) => (
            <li key={it.id} className="item">
              <div className="item-head">
                <span style={{ fontSize: 12, color: "#666", minWidth: 90 }}>
                  {it.provider === "youtube" ? "YouTube" : `Spotify${it.type ? " · " + it.type : ""}`}
                </span>
                <input
                  value={it.name || "Untitled"}
                  onChange={(e) => updateName(it.id, e.target.value)}
                  className="item-title"
                />
                <button onClick={() => toggleFav(it.id)} title="Toggle favorite" className="chip">
                  {it.favorite ? "⭐" : "☆"}
                </button>
                <button onClick={() => removeItem(it.id)} className="danger">Delete</button>
              </div>

              <div className="embed-wrap">
                <iframe
                  src={it.embed}
                  title={it.titleHint}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>

              <div className="item-notes">
                <label>Your note</label>
                <textarea
                  value={it.note}
                  onChange={(e) => updateNote(it.id, e.target.value)}
                  placeholder="Write a memory or why this song matters…"
                />
                <p className="muted">Added {new Date(it.createdAt).toLocaleString()}</p>
              </div>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <div style={{ textAlign: "left", marginTop: 16, color: "#666", fontSize: 14 }}>
            No items yet. Paste a YouTube or Spotify link above 🎧
          </div>
        )}

        <div style={{ ...divider, marginTop: 18 }} />
        <footer>Built with ❤. Everything is saved locally in your browser.</footer>
      </div>
    </div>
  );
}
