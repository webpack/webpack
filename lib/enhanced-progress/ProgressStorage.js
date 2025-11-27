const fs = require("fs");
const path = require("path");

class ProgressStorage {
  constructor() {
    this.file = path.join(process.cwd(), ".webpack-build-history.json");
    this.data = this.load();
  }

  load() {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf-8"));
    } catch {
      return [];
    }
  }

  save(duration) {
    this.data.push({
      timestamp: Date.now(),
      duration
    });

    fs.writeFileSync(this.file, JSON.stringify(this.data.slice(-20), null, 2));
  }

  getAverage() {
    if (this.data.length === 0) return null;
    return Math.round(this.data.reduce((a, b) => a + b.duration, 0) / this.data.length);
  }
}

module.exports = ProgressStorage;
