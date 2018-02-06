const {
	CSSURLDependency,
	CSSImportDependency
} = require('./dependencies');

class CSSDependencyPlugin {
	constructor(options) {
		this.plugin = 'CSSDependencyPlugin';
		this.options = options;
	}

	apply(compiler) {
		const { plugin, options } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { dependencyFactories, dependencyTemplates } = compilation;
			// const { parser } = normalModuleFactory.hooks

			dependencyFactories.set(CSSURLDependency, normalModuleFactory);
			dependencyFactories.set(CSSImportDependency, normalModuleFactory);

			dependencyTemplates.set(
				CSSImportDependency,
				new CSSImportDependency.Template()
			);

			// const handler = (parser, parserOptions) => {
			//   console.log(parser)
			//   return new CSSDependencyPlugin(options).apply(parser)
			// }
			//
			// parser.for('css/experimental').tap(plugin, handler);
		})
	}
}

module.exports = CSSDependencyPlugin;
