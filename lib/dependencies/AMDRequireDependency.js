/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");

/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */

class AMDRequireDependency extends NullDependency {
	constructor(block) {
		super();
		this.block = block;
	}
}

AMDRequireDependency.Template = class AMDRequireDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {AMDRequireDependency} */ (dependency);
		const depBlock = dep.block;
		const promise = runtimeTemplate.blockPromise({
			block: depBlock,
			message: "AMD require"
		});

		// has array range but no function range
		if (depBlock.arrayRange && !depBlock.functionRange) {
			const startBlock = `${promise}.then(function() {`;
			const endBlock = `;}).catch(${runtimeTemplate.onError()})`;
			source.replace(
				depBlock.outerRange[0],
				depBlock.arrayRange[0] - 1,
				startBlock
			);
			source.replace(
				depBlock.arrayRange[1],
				depBlock.outerRange[1] - 1,
				endBlock
			);
			return;
		}

		// has function range but no array range
		if (depBlock.functionRange && !depBlock.arrayRange) {
			const startBlock = `${promise}.then((`;
			const endBlock = `).bind(exports, __webpack_require__, exports, module)).catch(${runtimeTemplate.onError()})`;
			source.replace(
				depBlock.outerRange[0],
				depBlock.functionRange[0] - 1,
				startBlock
			);
			source.replace(
				depBlock.functionRange[1],
				depBlock.outerRange[1] - 1,
				endBlock
			);
			return;
		}

		// has array range, function range, and errorCallbackRange
		if (
			depBlock.arrayRange &&
			depBlock.functionRange &&
			depBlock.errorCallbackRange
		) {
			const startBlock = `${promise}.then(function() { `;
			const errorRangeBlock = `}${
				depBlock.functionBindThis ? ".bind(this)" : ""
			}).catch(`;
			const endBlock = `${
				depBlock.errorCallbackBindThis ? ".bind(this)" : ""
			})`;

			source.replace(
				depBlock.outerRange[0],
				depBlock.arrayRange[0] - 1,
				startBlock
			);
			source.insert(
				depBlock.arrayRange[0] + 0.9,
				"var __WEBPACK_AMD_REQUIRE_ARRAY__ = "
			);
			source.replace(
				depBlock.arrayRange[1],
				depBlock.functionRange[0] - 1,
				"; ("
			);
			source.insert(
				depBlock.functionRange[1],
				").apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);"
			);
			source.replace(
				depBlock.functionRange[1],
				depBlock.errorCallbackRange[0] - 1,
				errorRangeBlock
			);
			source.replace(
				depBlock.errorCallbackRange[1],
				depBlock.outerRange[1] - 1,
				endBlock
			);
			return;
		}

		// has array range, function range, but no errorCallbackRange
		if (depBlock.arrayRange && depBlock.functionRange) {
			const startBlock = `${promise}.then(function() { `;
			const endBlock = `}${
				depBlock.functionBindThis ? ".bind(this)" : ""
			}).catch(${runtimeTemplate.onError()})`;
			source.replace(
				depBlock.outerRange[0],
				depBlock.arrayRange[0] - 1,
				startBlock
			);
			source.insert(
				depBlock.arrayRange[0] + 0.9,
				"var __WEBPACK_AMD_REQUIRE_ARRAY__ = "
			);
			source.replace(
				depBlock.arrayRange[1],
				depBlock.functionRange[0] - 1,
				"; ("
			);
			source.insert(
				depBlock.functionRange[1],
				").apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);"
			);
			source.replace(
				depBlock.functionRange[1],
				depBlock.outerRange[1] - 1,
				endBlock
			);
		}
	}
};

module.exports = AMDRequireDependency;
