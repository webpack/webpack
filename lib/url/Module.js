const URLParser = require('./Parser');
const URLGenerator = require('./Generator');

class URLModulesPlugin {
	constructor() {
		this.plugin = "URLModulesPlugin";
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { moduleTemplates } = compilation.hooks;
			const { createParser, createGenerator } = normalModuleFactory.hooks;

			createParser.for('url/experimental').tap(plugin, () => {
				return new URLParser();
			})

			createGenerator.for('url/experimental').tap(plugin, () => {
				return new URLGenerator();
			});
		});
	}
}

module.exports = URLModulesPlugin;
