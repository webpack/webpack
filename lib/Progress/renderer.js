const readline = require("readline");

function time(sec) {
  if (!sec) return "--";
  sec = Math.round(sec);
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

class Renderer {
  constructor() {
    this.lastLines = 0;
    this.stdout = process.stdout;
  }

  render(state) {
    const {
      pct,
      message,
      elapsed,
      eta,
      modules,
      totalModules,
      baseline,
      phases
    } = state;

    const filled = Math.round((pct * 30));
    const bar =
      "█".repeat(filled) + "░".repeat(30 - filled);

    const lines = [
      `Build [${bar}] ${Math.round(pct * 100)}%  | ETA: ${time(eta)}`,
      `Modules: ${modules}/${totalModules || "?"}`,
      `Current: ${message}`,
      `Elapsed: ${time(elapsed)} | Baseline: ${time(baseline)}`
    ];

    if (phases) {
      lines.push("Phases:");
      for (const [name, v] of Object.entries(phases)) {
        lines.push(`  - ${name}: ${time(v)}`);
      }
    }

    readline.cursorTo(this.stdout, 0);
    readline.clearScreenDown(this.stdout);
    this.stdout.write(lines.join("\n") + "\n");
    this.lastLines = lines.length;
  }
}

module.exports = Renderer;
