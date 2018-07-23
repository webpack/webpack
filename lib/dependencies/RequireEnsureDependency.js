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

class RequireEnsureDependency extends NullDependency {
	constructor(block) {
		super();
		this.block = block;
	}

	get type() {
		return "require.ensure";
	}
}

RequireEnsureDependency.Template = class RequireEnsureDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {RequireEnsureDependency} */ (dependency);
		const depBlock = dep.block;
		const promise = runtimeTemplate.blockPromise({
			block: depBlock,
			message: "require.ensure"
		});
		const errorCallbackExists =
			depBlock.expr.arguments.length === 4 ||
			(!depBlock.chunkName && depBlock.expr.arguments.length === 3);
		const startBlock = `${promise}.then((`;
		const middleBlock = ").bind(null, __webpack_require__)).catch(";
		const endBlock = `).bind(null, __webpack_require__)).catch(${runtimeTemplate.onError()})`;
		source.replace(
			depBlock.expr.range[0],
			depBlock.expr.arguments[1].range[0] - 1,
			startBlock
		);
		if (errorCallbackExists) {
			source.replace(
				depBlock.expr.arguments[1].range[1],
				depBlock.expr.arguments[2].range[0] - 1,
				middleBlock
			);
			source.replace(
				depBlock.expr.arguments[2].range[1],
				depBlock.expr.range[1] - 1,
				")"
			);
		} else {
			source.replace(
				depBlock.expr.arguments[1].range[1],
				depBlock.expr.range[1] - 1,
				endBlock
			);
		}
	}
};

module.exports = RequireEnsureDependency;
