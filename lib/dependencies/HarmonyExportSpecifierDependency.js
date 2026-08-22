/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const { InlinedUsedName } = require("../optimize/InlineExports");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ExportBindingInitFragment = require("./ExportBindingInitFragment");
const HarmonyExportInitFragment = require("./HarmonyExportInitFragment");
const NullDependency = require("./NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import { ExportsSpec, LazyUntil } from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { ConnectionState } from "../ModuleGraphConnection" */
/** @import { InlinedValue } from "../optimize/InlineExports" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, string, InlinedValue | null | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, string, InlinedValue | null | undefined]>} ObjectSerializerContext */
/** @import { UnusedExports, ExportMap } from "./HarmonyExportInitFragment" */
/**
 * @import {
 * 	JavascriptModuleBuildInfo
 * } from "../javascript/JavascriptModule"
 */

// Required here rather than at the top: the plugin reaches back into the dependencies.
const getJavascriptModulesPlugin = memoize(() =>
	require("../javascript/JavascriptModulesPlugin")
);

class HarmonyExportSpecifierDependency extends NullDependency {
	/**
	 * Creates an instance of HarmonyExportSpecifierDependency.
	 * @param {string} id the id
	 * @param {string} name the name
	 * @param {InlinedValue | null=} constValue undefined = not const, null = const but not inline-eligible, InlinedValue = const and inline-eligible
	 */
	constructor(id, name, constValue) {
		super();
		/** @type {string} */
		this.id = id;
		/** @type {string} */
		this.name = name;
		/** @type {InlinedValue | null | undefined} */
		this.constValue = constValue;
	}

	get type() {
		return "harmony export specifier";
	}

	/**
	 * Returns how this dependency may be deferred when its parent module is side-effect-free (lazy barrel optimization).
	 * @returns {LazyUntil | null} lazy classification, null when it must be processed eagerly
	 */
	getLazyUntil() {
		return Dependency.LAZY_UNTIL_LOCAL;
	}

	/**
	 * Returns the export name for a `LAZY_UNTIL_LOCAL`/`LAZY_UNTIL_ID` classification (lazy barrel optimization).
	 * @returns {string | null} export name, null when not applicable
	 */
	getLazyName() {
		return this.name;
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const module = moduleGraph.getParentModule(this);
		const pureFunctions =
			module &&
			module.buildInfo &&
			/** @type {JavascriptModuleBuildInfo} */ (module.buildInfo).pureFunctions;
		const isPure = Boolean(pureFunctions && pureFunctions.has(this.id));

		return {
			exports: [
				{
					name: this.name,
					isPure: isPure || undefined,
					inlined: this.constValue || undefined
				}
			],
			priority: 1,
			terminalBinding: true,
			dependencies: undefined
		};
	}

	/**
	 * Gets module evaluation side effects state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this dependency connects the module to referencing modules
	 */
	getModuleEvaluationSideEffectsState(moduleGraph) {
		return false;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.id).write(this.name).write(this.constValue);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.id = context.read();
		const c1 = context.rest;
		this.name = c1.read();
		const c2 = c1.rest;
		this.constValue = c2.read();
		super.deserialize(c2.rest);
	}
}

makeSerializable(
	HarmonyExportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyExportSpecifierDependency"
);

HarmonyExportSpecifierDependency.Template = class HarmonyExportSpecifierDependencyTemplate extends (
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
		{
			module,
			moduleGraph,
			initFragments,
			runtime,
			runtimeTemplate,
			concatenationScope
		}
	) {
		const dep = /** @type {HarmonyExportSpecifierDependency} */ (dependency);
		// a wrapped module's bindings stay inside the wrapper, not in the shared scope
		if (concatenationScope && !concatenationScope.isWrapped()) {
			concatenationScope.registerExport(dep.name, dep.id);
			return;
		}
		const used = moduleGraph
			.getExportsInfo(module)
			.getUsedName(dep.name, runtime);
		if (!used) {
			/** @type {UnusedExports} */
			const set = new Set();
			set.add(dep.name || "namespace");
			initFragments.push(
				new HarmonyExportInitFragment(module.exportsArgument, undefined, set)
			);
			return;
		}

		if (used instanceof InlinedUsedName) {
			// Inlined: importing side substitutes the literal directly, skip export init
			return;
		}

		const canUseValueBinding =
			dep.constValue !== undefined &&
			/** @type {import("../Module").BuildInfo} */ (module.buildInfo)
				.isCircular === false;

		// A library exporting the same bindings natively reads none of them back off the
		// exports object, so it takes the call over and emits it only where wrapped.
		const hooks = getJavascriptModulesPlugin().getCompilationHooks(
			runtimeTemplate.compilation
		);
		const onDemand = hooks.onDemandExportsGeneration.isUsed()
			? (/** @type {string} */ definition, /** @type {boolean} */ placeAtEnd) =>
					hooks.onDemandExportsGeneration.call(
						module,
						runtime,
						definition,
						placeAtEnd
					) === true
			: undefined;

		if (canUseValueBinding) {
			initFragments.push(
				new ExportBindingInitFragment(
					module.exportsArgument,
					[
						{
							name: used,
							value: `/* binding */ ${dep.id}`,
							bindingType: "value"
						}
					],
					true,
					onDemand
				)
			);
		} else {
			/** @type {ExportMap} */
			const map = new Map();
			map.set(used, `/* binding */ ${dep.id}`);
			initFragments.push(
				new HarmonyExportInitFragment(
					module.exportsArgument,
					map,
					undefined,
					onDemand
				)
			);
		}
	}
};

module.exports = HarmonyExportSpecifierDependency;
