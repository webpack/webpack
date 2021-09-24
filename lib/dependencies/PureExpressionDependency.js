/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { UsageState } = require("../ExportsInfo");
const makeSerializable = require("../util/makeSerializable");
const { filterRuntime } = require("../util/runtime");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../util/Hash")} Hash */

class PureExpressionDependency extends NullDependency {
	/**
	 * @param {[number, number]} range the source range
	 */
	constructor(range) {
		super();
		this.range = range;
		/** @type {Set<string> | false} */
		this.usedByExports = false;
		this._hashUpdate = undefined;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		if (this._hashUpdate === undefined) {
			this._hashUpdate = this.range + "";
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this dependency connects the module to referencing modules
	 */
	getModuleEvaluationSideEffectsState(moduleGraph) {
		return false;
	}

	serialize(context) {
		const { write } = context;
		write(this.range);
		write(this.usedByExports);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.range = read();
		this.usedByExports = read();
		super.deserialize(context);
	}
}

makeSerializable(
	PureExpressionDependency,
	"webpack/lib/dependencies/PureExpressionDependency"
);

PureExpressionDependency.Template = class PureExpressionDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ chunkGraph, moduleGraph, runtime, runtimeTemplate, runtimeRequirements }
	) {
		const dep = /** @type {PureExpressionDependency} */ (dependency);

		const usedByExports = dep.usedByExports;
		if (usedByExports !== false) {
			const selfModule = moduleGraph.getParentModule(dep);
			const exportsInfo = moduleGraph.getExportsInfo(selfModule);
			const runtimeCondition = filterRuntime(runtime, runtime => {
				for (const exportName of usedByExports) {
					if (exportsInfo.getUsed(exportName, runtime) !== UsageState.Unused) {
						return true;
					}
				}
				return false;
			});
			if (runtimeCondition === true) return;
			if (runtimeCondition !== false) {
				const condition = runtimeTemplate.runtimeConditionExpression({
					chunkGraph,
					runtime,
					runtimeCondition,
					runtimeRequirements
				});
				source.insert(
					dep.range[0],
					`(/* runtime-dependent pure expression or super */ ${condition} ? (`
				);
				source.insert(dep.range[1], ") : null)");
				return;
			}
		}

		source.insert(
			dep.range[0],
			`(/* unused pure expression or super */ null && (`
		);
		source.insert(dep.range[1], "))");
	}
};

module.exports = PureExpressionDependency;
