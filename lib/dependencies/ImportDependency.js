/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");
const HarmonyImportGuard = require("./HarmonyImportGuard");
const { ImportPhaseUtils } = require("./ImportPhase");
const ModuleDependency = require("./ModuleDependency");
const importOptionsCheck = require("./importOptionsCheck");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import AsyncDependenciesBlock from "../AsyncDependenciesBlock" */
/**
 * @import {
 * 	GetConditionFn,
 * 	RawReferencedExports,
 * 	ReferencedExports
 * } from "../Dependency"
 */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import Module, { BuildMeta } from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { ImportAttributes, Range } from "../javascript/JavascriptParser" */
/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../serialization/ObjectMiddleware"
 */
/** @import { RuntimeSpec } from "../util/runtime" */
/** @import { DependencyGuard } from "./HarmonyImportGuard" */
/** @import { ImportPhaseType } from "./ImportPhase" */

class ImportDependency extends ModuleDependency {
	/**
	 * Creates an instance of ImportDependency.
	 * @param {string} request the request
	 * @param {Range} range expression range
	 * @param {RawReferencedExports | null} referencedExports list of referenced exports
	 * @param {ImportPhaseType} phase import phase
	 * @param {ImportAttributes=} attributes import attributes
	 */
	constructor(request, range, referencedExports, phase, attributes) {
		super(request);
		this.range = range;
		/** @type {RawReferencedExports | null} */
		this.referencedExports = referencedExports;
		/** @type {ImportPhaseType} */
		this.phase = phase;
		/** @type {ImportAttributes | undefined} */
		this.attributes = attributes;
		/** @type {DependencyGuard[] | undefined} */
		this.branchGuards = undefined;
		// Range of the `import(specifier, options)` second argument, set only when
		// it is not a statically extractable attributes object and must therefore
		// be evaluated and validated at runtime.
		/** @type {Range | undefined} */
		this.optionsRange = undefined;
	}

	get type() {
		return "import()";
	}

	get category() {
		return "esm";
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		const guards = this.branchGuards;
		if (guards === undefined) return null;
		return (connection, runtime) =>
			!HarmonyImportGuard.isDeadByGuards(guards, moduleGraph, runtime);
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		let str = super.getResourceIdentifier();
		// We specifically use this check to avoid writing the default (`evaluation` or `0`) value and save memory
		if (this.phase) {
			str += `|phase${ImportPhaseUtils.stringify(this.phase)}`;
		}
		if (this.attributes) {
			str += `|attributes${JSON.stringify(this.attributes)}`;
		}
		return str;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		if (!this.referencedExports) return Dependency.EXPORTS_OBJECT_REFERENCED;
		/** @type {ReferencedExports} */
		const refs = [];
		for (const referencedExport of this.referencedExports) {
			if (referencedExport[0] === "default") {
				const selfModule =
					/** @type {Module} */
					(moduleGraph.getParentModule(this));
				const importedModule =
					/** @type {Module} */
					(moduleGraph.getModule(this));
				const exportsType = importedModule.getExportsType(
					moduleGraph,
					/** @type {BuildMeta} */
					(selfModule.buildMeta).strictHarmonyModule
				);
				if (
					exportsType === "default-only" ||
					exportsType === "default-with-named"
				) {
					return Dependency.EXPORTS_OBJECT_REFERENCED;
				}
			}
			refs.push({
				name: referencedExport,
				canMangle: false,
				canInline: false
			});
		}
		return refs;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.range);
		context.write(this.referencedExports);
		context.write(this.phase);
		context.write(this.attributes);
		context.write(this.branchGuards);
		context.write(this.optionsRange);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.range = context.read();
		this.referencedExports = context.read();
		this.phase = context.read();
		this.attributes = context.read();
		this.branchGuards = context.read();
		this.optionsRange = context.read();
		super.deserialize(context);
	}
}

makeSerializable(ImportDependency, "webpack/lib/dependencies/ImportDependency");

ImportDependency.Template = class ImportDependencyTemplate extends (
	ModuleDependency.Template
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
		{
			runtimeTemplate,
			module,
			moduleGraph,
			chunkGraph,
			runtimeRequirements,
			runtime
		}
	) {
		const dep = /** @type {ImportDependency} */ (dependency);
		const connection = moduleGraph.getConnection(dep);
		// Dead branch: module is excluded and has no id; code is never executed.
		if (connection && !connection.isTargetActive(runtime)) {
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				"Promise.resolve(/* dead branch */)"
			);
			return;
		}
		const block = /** @type {AsyncDependenciesBlock} */ (
			moduleGraph.getParentBlock(dep)
		);
		let content = runtimeTemplate.moduleNamespacePromise({
			chunkGraph,
			block,
			module: /** @type {Module} */ (moduleGraph.getModule(dep)),
			request: dep.request,
			strict: /** @type {BuildMeta} */ (module.buildMeta).strictHarmonyModule,
			dependency: dep,
			message: "import()",
			runtimeRequirements,
			originModule: module
		});

		// For source phase imports, unwrap the default export
		// import.source() should return the source directly, not a namespace
		if (ImportPhaseUtils.isSource(dep.phase)) {
			content = `${content}.then(${runtimeTemplate.returningFunction(
				'm["default"]',
				"m"
			)})`;
		}

		// A non-static second argument must still be evaluated (for its side
		// effects and evaluation order) and checked per spec, so keep it in place
		// and wrap it.
		if (dep.optionsRange) {
			const check = importOptionsCheck(runtimeTemplate, ["o"], content);
			// The options range excludes any parentheses the source had, so a
			// comma expression would otherwise split into arguments of its own.
			source.replace(dep.range[0], dep.optionsRange[0] - 1, `(${check})((`);
			source.replace(dep.optionsRange[1], dep.range[1] - 1, "))");
			return;
		}

		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
};

module.exports = ImportDependency;
