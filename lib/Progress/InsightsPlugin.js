const HistoryStore = require("./historyStore");
const Renderer = require("./renderer");

class InsightsPlugin {
  constructor(options = {}) {
    this.options = {
      baselineCount: 10,
      showPhases: true,
      ...options
    };

    this.history = new HistoryStore(this.options.baselineCount);
    this.renderer = new Renderer();

    this.start = 0;
    this.phaseStart = {};
    this.phases = {};
  }

  apply(compiler) {
    compiler.hooks.beforeRun.tap("InsightsPlugin", () => {
      this.start = Date.now();
      this.phases = {};
      this.phaseStart = {};
    });

    compiler.hooks.compilation.tap("InsightsPlugin", () => {
      this._phase("compilation");
    });

    compiler.hooks.emit.tapAsync("InsightsPlugin", (compilation, cb) => {
      this._phase("emit");
      cb();
    });

    compiler.hooks.done.tap("InsightsPlugin", stats => {
      const total = (Date.now() - this.start) / 1000;

      const entry = {
        total,
        phases: this.phases,
        date: new Date().toISOString()
      };

      this.history.save(entry);
    });
  }

  updateProgress(pct, message, modules, totalModules) {
    const now = Date.now();
    const elapsed = (now - this.start) / 1000;

    const baseline = (() => {
      const arr = this.history.load();
      if (!arr.length) return 0;
      return (
        arr.reduce((a, x) => a + x.total, 0) / arr.length
      );
    })();

    const eta =
      pct > 0.01 ? (elapsed / pct) - elapsed : 0;

    this.renderer.render({
      pct,
      message,
      elapsed,
      eta,
      modules,
      totalModules,
      baseline,
      phases: this.phases
    });
  }

  _phase(name) {
    const now = Date.now();
    if (!this.phaseStart[name]) this.phaseStart[name] = now;

    const sec =
      (now - this.phaseStart[name]) / 1000;

    this.phases[name] = sec;
  }
}

module.exports = InsightsPlugin;
