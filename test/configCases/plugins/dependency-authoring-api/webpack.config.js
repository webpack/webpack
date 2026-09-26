"use strict";

const PLUGIN_NAME = "DependencyAuthoringApiPlugin";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").javascript.JavascriptParser} JavascriptParser */
/** @typedef {Compiler["webpack"]} WebpackApi */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */

/** @type {undefined | EXPECTED_ANY} */
let cached;

// `makeSerializable` registers globally, so the classes are built once and
// reused: a second compiler re-running this would re-register the request.
/**
 * Builds the dependency and its template from webpack's public surface.
 * @param {WebpackApi} webpack the `compiler.webpack` object
 * @returns {EXPECTED_ANY} the dependency class and its template
 */
const getMarker = (webpack) => {
	if (cached !== undefined) return cached;

	const { Dependency, template, util } = webpack;
	const { DependencyTemplate } = template;
	const { makeSerializable } = util;

	class MarkerDependency extends Dependency {
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
			return "marker";
		}

		/**
		 * @returns {boolean} true, when the dependency can affect its referencing module
		 */
		couldAffectReferencingModule() {
			return false;
		}

		/**
		 * Serializes this instance into the provided serializer context.
		 * @param {EXPECTED_ANY} context context
		 */
		serialize(context) {
			context.write(this.range);
			super.serialize(context);
		}

		/**
		 * Restores this instance from the provided deserializer context.
		 * @param {EXPECTED_ANY} context context
		 */
		deserialize(context) {
			this.range = context.read();
			super.deserialize(context);
		}
	}

	makeSerializable(
		MarkerDependency,
		"test/configCases/plugins/dependency-authoring-api/MarkerDependency"
	);

	class MarkerDependencyTemplate extends DependencyTemplate {
		/**
		 * @param {EXPECTED_ANY} dependency the dependency
		 * @param {ReplaceSource} source the current replace source
		 * @returns {void}
		 */
		apply(dependency, source) {
			source.replace(
				dependency.range[0],
				dependency.range[1] - 1,
				JSON.stringify("marked")
			);
		}
	}

	cached = { MarkerDependency, MarkerDependencyTemplate };
	return cached;
};

// Authors a dependency the way the guide describes, reaching every piece
// through `compiler.webpack` so the case fails if one stops being public.
class DependencyAuthoringApiPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { NullFactory } = compiler.webpack.module;
		const { MarkerDependency, MarkerDependencyTemplate } = getMarker(
			compiler.webpack
		);

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					MarkerDependency,
					new NullFactory()
				);
				compilation.dependencyTemplates.set(
					MarkerDependency,
					new MarkerDependencyTemplate()
				);

				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					parser.hooks.expression
						.for("__MARKER__")
						.tap(PLUGIN_NAME, (expression) => {
							const dependency = new MarkerDependency(expression.range);
							dependency.loc = parser.getLocation(expression);
							parser.state.module.addDependency(dependency);
							return true;
						});
				};

				for (const type of [
					"javascript/auto",
					"javascript/esm",
					"javascript/dynamic"
				]) {
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
	plugins: [new DependencyAuthoringApiPlugin()]
};
