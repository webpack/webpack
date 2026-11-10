"use strict";

const PLUGIN_NAME = "DependencyWithoutKindsPlugin";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").javascript.JavascriptParser} JavascriptParser */
/** @typedef {Compiler["webpack"]} WebpackApi */
/** @typedef {typeof import("../../../../").Dependency} DependencyClass */
/** @typedef {typeof import("../../../../").template.DependencyTemplate} DependencyTemplateClass */
/** @typedef {{ ForeignDependency: DependencyClass, ForeignDependencyTemplate: DependencyTemplateClass }} Foreign */

/** @type {Foreign | undefined} */
let cached;

/**
 * Builds a dependency that, like one extending an older webpack's `Dependency`, has no `is()`.
 * @param {WebpackApi} webpack the `compiler.webpack` object
 * @returns {Foreign} the dependency class and its template
 */
const getForeign = (webpack) => {
	if (cached !== undefined) return cached;

	const { Dependency, template, util } = webpack;

	class ForeignDependency extends Dependency {
		/**
		 * @returns {string} the dependency type
		 */
		get type() {
			return "foreign";
		}

		/**
		 * @returns {boolean} true, when the dependency can affect its referencing module
		 */
		couldAffectReferencingModule() {
			return false;
		}
	}

	/** @type {EXPECTED_ANY} */ (ForeignDependency.prototype).is = undefined;

	util.makeSerializable(
		ForeignDependency,
		"test/configCases/plugins/dependency-without-kinds/ForeignDependency"
	);

	class ForeignDependencyTemplate extends template.DependencyTemplate {
		apply() {}
	}

	cached = { ForeignDependency, ForeignDependencyTemplate };
	return cached;
};

class DependencyWithoutKindsPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { NullFactory } = compiler.webpack.module;
		const { ForeignDependency, ForeignDependencyTemplate } = getForeign(
			compiler.webpack
		);

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ForeignDependency,
					new NullFactory()
				);
				compilation.dependencyTemplates.set(
					ForeignDependency,
					new ForeignDependencyTemplate()
				);

				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					parser.hooks.program.tap(PLUGIN_NAME, () => {
						parser.state.module.addDependency(new ForeignDependency());
					});
				};

				for (const type of ["javascript/auto", "javascript/esm"]) {
					normalModuleFactory.hooks.parser
						.for(type)
						.tap(PLUGIN_NAME, (parser) => {
							handler(/** @type {JavascriptParser} */ (parser));
						});
				}
			}
		);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	experiments: { deferImport: true },
	optimization: { concatenateModules: true, sideEffects: true },
	plugins: [new DependencyWithoutKindsPlugin()]
};
