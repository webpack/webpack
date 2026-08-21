/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const HarmonyImportGuard = require("./HarmonyImportGuard");
const NullDependency = require("./NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import { Range } from "../javascript/JavascriptParser" */
/** @import CommonJsRequireDependency from "./CommonJsRequireDependency" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[Range, CommonJsRequireDependency | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[Range, CommonJsRequireDependency | undefined]>} ObjectSerializerContext */

class RequireHeaderDependency extends NullDependency {
	/**
	 * Creates an instance of RequireHeaderDependency.
	 * @param {Range} range range of the `require` callee
	 * @param {CommonJsRequireDependency=} requireDependency paired require dep (unset for conditional `require(a ? b : c)`)
	 */
	constructor(range, requireDependency) {
		super();
		if (!Array.isArray(range)) throw new Error("range must be valid");
		this.range = range;
		/** @type {CommonJsRequireDependency | undefined} */
		this.requireDependency = requireDependency;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.range).write(this.requireDependency);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {RequireHeaderDependency} RequireHeaderDependency
	 */
	static deserialize(context) {
		const range = context.read();
		const c1 = context.rest;
		const obj = new RequireHeaderDependency(range, c1.read());
		obj.deserialize(c1.rest);
		return obj;
	}
}

makeSerializable(
	RequireHeaderDependency,
	"webpack/lib/dependencies/RequireHeaderDependency"
);

RequireHeaderDependency.Template = class RequireHeaderDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ moduleGraph, runtime, runtimeRequirements, concatenationScope }
	) {
		const dep = /** @type {RequireHeaderDependency} */ (dependency);

		// the paired require dependency already replaced the whole call
		if (
			concatenationScope !== undefined &&
			concatenationScope.isInsideReplacedRequire(dep.range[0])
		) {
			return;
		}

		const requireDep = dep.requireDependency;
		// Skip when the paired call became `0`; dead-branch still needs the header.
		if (requireDep) {
			const connection = moduleGraph.getConnection(requireDep);
			if (
				connection &&
				!connection.isTargetActive(runtime) &&
				requireDep.isEvaluationOnly()
			) {
				const guards = requireDep.branchGuards;
				if (
					guards === undefined ||
					!HarmonyImportGuard.isDeadByGuards(guards, moduleGraph, runtime)
				) {
					return;
				}
			}
		}

		runtimeRequirements.add(RuntimeGlobals.require);
		source.replace(dep.range[0], dep.range[1] - 1, RuntimeGlobals.require);
	}
};

module.exports = RequireHeaderDependency;
