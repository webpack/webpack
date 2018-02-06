const {
	URLDependency
} = require('./dependencies')

const plugin = 'URLDependencyPlugin'

class URLDependencyPlugin {
	constructor(options) {
		this.plugin = "URLDependencyPlugin";
		this.options = options;
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { dependencyFactories } = compilation;

			dependencyFactories.set(URLDependency, normalModuleFactory);
		});
	}
}

module.exports = URLDependencyPlugin;
