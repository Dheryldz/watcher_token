// src/dedupStore.js
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(process.cwd(), 'data');
const FILE = path.join(DIR, 'dedup.json');

function ensure() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}), 'utf8');
}

function load() {
  ensure();
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const obj = JSON.parse(raw || '{}');
    return obj;
  } catch {
    return {};
  }
}

function save(map) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(map), 'utf8');
}

function has(key) {
  const map = load();
  return !!map[key];
}

function add(key) {
  const map = load();
  map[key] = Date.now();
  const entries = Object.entries(map);
  const MAX = 5000;
  if (entries.length > MAX) {
    entries.sort((a, b) => a[1] - b[1]);
    const pruned = Object.fromEntries(entries.slice(entries.length - MAX));
    save(pruned);
  } else {
    save(map);
  }
}

module.exports = { has, add };
