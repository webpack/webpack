const fs = require("fs");
const path = require("path");

const DIR = ".webpack-progress";
const FILE = "history.json";

class HistoryStore {
  constructor(max = 10) {
    this.max = max;
    this.dir = DIR;
    this.file = path.join(DIR, FILE);
  }

  ensureDir() {
    try {
      if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir, { recursive: true });
      }
    } catch {}
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) return [];
      const data = fs.readFileSync(this.file, "utf8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  save(entry) {
    try {
      this.ensureDir();
      const arr = this.load();
      arr.unshift(entry);
      if (arr.length > this.max) arr.length = this.max;
      fs.writeFileSync(this.file, JSON.stringify(arr, null, 2));
    } catch {}
  }
}

module.exports = HistoryStore;
