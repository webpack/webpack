const CssParser = require("./CssParser");

class CssModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("CssModulesPlugin", (compilation, {
			normalModuleFactory
		}) => {
			normalModuleFactory.hooks.createParser.for("css/experimental").tap("CssModulesPlugin", () => {
				return new CssParser();
			});
		});
	}
}

module.exports = CssModulesPlugin;
