class TestPlugin {
	apply(compiler) {
		compiler.hooks.emit.tap("TestPlugin", compilation => {
			compilation.hooks.stats.tap("TestPlugin", stats => {
				stats.hooks.setDefault.for("entrypoints").tap("TestPlugin", () => true);
			});
		});
	}
}
module.exports = TestPlugin;
