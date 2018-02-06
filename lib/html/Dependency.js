const {
	HTMLURLDependency,
	HTMLImportDependency
} = require('./dependencies')

class HTMLDependencyPlugin {
	constructor(options) {
		this.plugin = 'HTMLDependencyPlugin';
		this.options = options;
	}

	apply (compiler) {
		const { plugin, options } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { dependencyFactories, dependencyTemplates } = compilation;
			// const { parser } = normalModuleFactory;

			dependencyFactories.set(HTMLURLDependency, normalModuleFactory);
			dependencyFactories.set(HTMLImportDependency, normalModuleFactory);

			dependencyTemplates.set(
				HTMLImportDependency,
				new HTMLImportDependency.Template()
			);

			// const handler = (parser, parserOptions) => {
			//   new HTMLImportParserPlugin(options).apply(parser);
			// };
			//
			// parser.for('html/experimental').tap(plugin, handler);
		});
	}
}

module.exports = HTMLDependencyPlugin;
