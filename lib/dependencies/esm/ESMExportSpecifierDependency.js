/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../../graph/Dependency");
const { isInlinedUsedName } = require("../../optimize/InlineExports");
const makeSerializable = require("../../util/makeSerializable");
const { getRuntimeKey } = require("../../util/runtime");
const NullDependency = require("../core/NullDependency");
const ESMExportInitFragment = require("./ESMExportInitFragment");

const { ExportBindingType } = ESMExportInitFragment;

/** @import { ReplaceSource } from "webpack-sources" */
/** @import { DependencyKinds, ExportsSpec, LazyRole, UpdateHashContext } from "../../graph/Dependency" */
/** @import Module, { BuildInfo } from "../../module/Module" */
/** @import Hash from "../../util/Hash" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import ModuleGraph from "../../graph/ModuleGraph" */
/** @import { ConnectionState } from "../../graph/ModuleGraphConnection" */
/** @import { InlinedValue } from "../../optimize/InlineExports" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, string, InlinedValue | null | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[string, string, InlinedValue | null | undefined]>} ObjectSerializerContext */
/** @import { UnusedExports, ExportMap } from "./ESMExportInitFragment" */
/**
 * @import {
 * 	JavascriptModuleBuildInfo
 * } from "../../javascript/JavascriptModule"
 */

class ESMExportSpecifierDependency extends NullDependency {
	/**
	 * Creates an instance of ESMExportSpecifierDependency.
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
	 * @returns {LazyRole | null} lazy classification, null when it must be processed eagerly
	 */
	get lazyRole() {
		return Dependency.LAZY_LOCAL_EXPORT;
	}

	/**
	 * Returns the export name for a `LAZY_LOCAL_EXPORT`/`LAZY_NAMED_REEXPORT` classification (lazy barrel optimization).
	 * @returns {string | null} export name, null when not applicable
	 */
	get lazyName() {
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
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		// the module's cycles, known only after it is built, pick value or getter
		if (this.constValue === undefined) return;
		const module = /** @type {Module} */ (
			context.chunkGraph.moduleGraph.getParentModule(this)
		);
		hash.update(
			/** @type {BuildInfo} */ (module.buildInfo).isCircular === false
				? "value"
				: "getter"
		);
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

makeSerializable(ESMExportSpecifierDependency, [
	"webpack/lib/dependencies/esm/ESMExportSpecifierDependency",
	// TODO in the next major release: remove, it restores the packs written
	// under the name the file had before the ESM rename
	"webpack/lib/dependencies/HarmonyExportSpecifierDependency"
]);

ESMExportSpecifierDependency.Template = class ESMExportSpecifierDependencyTemplate extends (
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
		{ module, moduleGraph, initFragments, runtime, concatenationScope }
	) {
		const dep = /** @type {ESMExportSpecifierDependency} */ (dependency);
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
				new ESMExportInitFragment(module.exportsArgument, undefined, set)
			);
			return;
		}

		if (isInlinedUsedName(used)) {
			// Inlined: importing side substitutes the literal directly, skip export init
			return;
		}

		const buildInfo =
			/** @type {import("../../module/Module").BuildInfo} */
			(module.buildInfo);
		const valueFormat =
			dep.constValue !== undefined && buildInfo.isCircular === false;

		const meta = moduleGraph.getMetaIfExisting(module);

		const onDemand =
			!concatenationScope &&
			meta !== undefined &&
			meta.onDemandExports === true;

		// a module library may have moved the binding to the chunk's scope
		const live =
			meta !== undefined && meta.liveBindings !== undefined
				? meta.liveBindings.get(dep.id)
				: undefined;
		const local =
			live !== undefined && live.runtimes.has(getRuntimeKey(runtime))
				? live.name
				: dep.id;

		/** @type {ExportMap} */
		const map = new Map();
		map.set(used, {
			value: `/* binding */ ${local}`,
			type: valueFormat ? ExportBindingType.Value : ExportBindingType.Getter,
			finalName: local
		});
		initFragments.push(
			new ESMExportInitFragment(
				module.exportsArgument,
				map,
				undefined,
				onDemand
			)
		);
	}
};

/** @type {Set<keyof DependencyKinds>} */
ESMExportSpecifierDependency.KINDS = new Set([
	...NullDependency.KINDS,
	"esm-export-specifier"
]);

module.exports = ESMExportSpecifierDependency;
