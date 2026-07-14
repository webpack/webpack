/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */

/** @typedef {Map<string, string>} Dependencies */

/**
 * Represents AwaitDependenciesInitFragment.
 * @extends {InitFragment<GenerateContext>}
 */
class AwaitDependenciesInitFragment extends InitFragment {
	/**
	 * Creates an instance of AwaitDependenciesInitFragment.
	 * @param {Dependencies} dependencies maps an import var to an async module that needs to be awaited
	 * @param {boolean=} generatorLowered module is emitted as a generator, so use `yield` instead of `await`
	 */
	constructor(dependencies, generatorLowered = false) {
		super(
			undefined,
			InitFragment.STAGE_ASYNC_DEPENDENCIES,
			0,
			"await-dependencies"
		);
		/** @type {Dependencies} */
		this.dependencies = dependencies;
		/** @type {boolean} */
		this.generatorLowered = generatorLowered;
	}

	/**
	 * Merges another await-dependencies fragment into this fragment.
	 * @param {AwaitDependenciesInitFragment} other other AwaitDependenciesInitFragment
	 * @returns {AwaitDependenciesInitFragment} AwaitDependenciesInitFragment
	 */
	merge(other) {
		const dependencies = new Map(other.dependencies);
		for (const [key, value] of this.dependencies) {
			dependencies.set(key, value);
		}
		return new AwaitDependenciesInitFragment(
			dependencies,
			this.generatorLowered || other.generatorLowered
		);
	}

	/**
	 * Returns the source code that will be included as initialization code.
	 * @param {GenerateContext} context context
	 * @returns {string | Source | undefined} the source code that will be included as initialization code
	 */
	getContent({ runtimeRequirements, runtimeTemplate }) {
		runtimeRequirements.add(RuntimeGlobals.module);
		if (this.dependencies.size === 0) {
			return "";
		}

		const importVars = [...this.dependencies.keys()];
		const asyncModuleValues = [...this.dependencies.values()].join(", ");

		// In a generator-lowered module (no `async`/`await`, but generators) the
		// dependency `await` becomes `yield`; the body stays a single scope.
		const suspend = this.generatorLowered ? "yield" : "await";

		const templateInput = [
			`var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([${asyncModuleValues}]);`
		];

		if (
			this.dependencies.size === 1 ||
			!runtimeTemplate.supportsDestructuring()
		) {
			templateInput.push(
				`var __webpack_async_dependencies_result__ = (__webpack_async_dependencies__.then ? (${suspend} __webpack_async_dependencies__)() : __webpack_async_dependencies__);`
			);
			for (const [index, importVar] of importVars.entries()) {
				templateInput.push(
					`${importVar} = __webpack_async_dependencies_result__[${index}];`
				);
			}
		} else {
			const importVarsStr = importVars.join(", ");

			templateInput.push(
				`([${importVarsStr}] = __webpack_async_dependencies__.then ? (${suspend} __webpack_async_dependencies__)() : __webpack_async_dependencies__);`
			);
		}

		templateInput.push("");

		return Template.asString(templateInput);
	}
}

module.exports = AwaitDependenciesInitFragment;
