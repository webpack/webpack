const ProgressPlugin = require("../ProgressPlugin");
const ProgressStorage = require("./ProgressStorage");

class EnhancedProgressPlugin {
  constructor(options = {}) {
    this.options = options;
    this.store = new ProgressStorage();
    this.startTime = 0;
  }

  apply(compiler) {
    this.startTime = Date.now();

    const progress = new ProgressPlugin((percentage, message, ...args) => {
      const percent = Math.floor(percentage * 100);

      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

      const avg = this.store.getAverage();
      const eta = avg ? avg - elapsed : null;

      console.clear();
      console.log(
        `Building [${"█".repeat(percent / 5)}${"░".repeat(20 - percent / 5)}] ${percent}%`
      );
      console.log(`Phase: ${message}`);
      console.log(`Elapsed: ${elapsed}s`);
      if (eta > 0) console.log(`ETA: ${eta}s`);
      if (avg) console.log(`Avg Build Time: ${avg}s`);
    });

    progress.apply(compiler);

    compiler.hooks.done.tap("EnhancedProgressPlugin", stats => {
      const duration = Math.round((Date.now() - this.startTime) / 1000);
      this.store.save(duration);

      console.log(`\nBuild completed in ${duration}s`);
    });
  }
}

module.exports = EnhancedProgressPlugin;
