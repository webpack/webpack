class ThisPlugin {
	apply(compiler) {
		compiler.hooks.done.tap("This Plugin", stats => {
			stats.hooks.setDefault.for("version").tap("ThisPlugin", () => false);
			stats.hooks.setDefault.for("timings").tap("ThisPlugin", () => false);
			stats.hooks.setDefault.for("builtAt").tap("ThisPlugin", () => false);
			stats.hooks.setDefault.for("hash").tap("ThisPlugin", () => false);
		});
	}
}
module.exports = ThisPlugin;
