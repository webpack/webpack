class TestPlugin {
	apply(compiler) {
		compiler.hooks.emit.tap("TestPlugin", compilation => {
			compilation.hooks.stats.tap("TestPlugin", stats => {
				stats.hooks.setDefault.for("timings").tap("TestPlugin", () => false);
			});
		});
	}
}
module.exports = TestPlugin;
