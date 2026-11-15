"use strict";

const PLUGIN_NAME = "ModuleReferencePlugin";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").javascript.JavascriptParser} JavascriptParser */
/** @typedef {import("../../../../").Module} Module */
/** @typedef {import("../../../../").ModuleGraph} ModuleGraph */
/** @typedef {import("../../../../").optimize.ConcatenationScope} ConcatenationScope */
/** @typedef {Compiler["webpack"]} WebpackApi */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */

/** @type {undefined | EXPECTED_ANY} */
let cached;

/**
 * Finds the `./target.js` module the current module requires.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the current module
 * @returns {Module | undefined} the target module
 */
const findTarget = (moduleGraph, module) => {
	for (const connection of moduleGraph.getOutgoingConnections(module)) {
		const name = connection.module && connection.module.nameForCondition();
		if (name && name.endsWith("target.js")) return connection.module;
	}
	return undefined;
};

// `makeSerializable` registers globally, so the classes are built once.
/**
 * Builds a dependency whose template writes a module reference token.
 * @param {WebpackApi} webpack the `compiler.webpack` object
 * @returns {EXPECTED_ANY} the dependency class and its template
 */
const getReference = (webpack) => {
	if (cached !== undefined) return cached;

	const { Dependency, template, util } = webpack;
	const { DependencyTemplate } = template;

	class ModuleReferenceTestDependency extends Dependency {
		/**
		 * @param {[number, number]} range the range to replace
		 */
		constructor(range) {
			super();
			this.range = range;
		}

		/**
		 * @returns {string} the dependency type
		 */
		get type() {
			return "module reference test";
		}

		/**
		 * @returns {boolean} true, when the dependency can affect its referencing module
		 */
		couldAffectReferencingModule() {
			return false;
		}

		/**
		 * @param {EXPECTED_ANY} context context
		 */
		serialize(context) {
			context.write(this.range);
			super.serialize(context);
		}

		/**
		 * @param {EXPECTED_ANY} context context
		 */
		deserialize(context) {
			this.range = context.read();
			super.deserialize(context);
		}
	}

	util.makeSerializable(
		ModuleReferenceTestDependency,
		"test/configCases/concatenate-modules/marker-like-text-wrapped/ModuleReferenceTestDependency"
	);

	class ModuleReferenceTestDependencyTemplate extends DependencyTemplate {
		/**
		 * @param {EXPECTED_ANY} dependency the dependency
		 * @param {ReplaceSource} source the current replace source
		 * @param {{ module: Module, moduleGraph: ModuleGraph, concatenationScope?: ConcatenationScope }} templateContext the context
		 * @returns {void}
		 */
		apply(dependency, source, { module, moduleGraph, concatenationScope }) {
			const target = findTarget(moduleGraph, module);
			const content =
				target &&
				concatenationScope &&
				concatenationScope.isModuleInScope(target)
					? concatenationScope.createModuleReference(target, {
							ids: ["value"],
							asiSafe: true
						})
					: "undefined";
			source.replace(dependency.range[0], dependency.range[1] - 1, content);
		}
	}

	cached = {
		ModuleReferenceTestDependency,
		ModuleReferenceTestDependencyTemplate
	};
	return cached;
};

// Writes a module reference token from a dependency template, as a plugin
// would, so the link step has to keep resolving tokens it did not create.
class ModuleReferencePlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { NullFactory } = compiler.webpack.module;
		const {
			ModuleReferenceTestDependency,
			ModuleReferenceTestDependencyTemplate
		} = getReference(compiler.webpack);

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ModuleReferenceTestDependency,
					new NullFactory()
				);
				compilation.dependencyTemplates.set(
					ModuleReferenceTestDependency,
					new ModuleReferenceTestDependencyTemplate()
				);
				for (const type of ["javascript/auto", "javascript/esm"]) {
					normalModuleFactory.hooks.parser
						.for(type)
						.tap(PLUGIN_NAME, (parser) => {
							const javascriptParser = /** @type {JavascriptParser} */ (parser);
							javascriptParser.hooks.expression
								.for("TEST_MODULE_REFERENCE")
								.tap(PLUGIN_NAME, (expression) => {
									const dependency = new ModuleReferenceTestDependency(
										/** @type {[number, number]} */ (expression.range)
									);
									dependency.loc = javascriptParser.getLocation(expression);
									javascriptParser.state.module.addDependency(dependency);
									return true;
								});
						});
				}
			}
		);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/source" }]
	},
	plugins: [new ModuleReferencePlugin()]
};
