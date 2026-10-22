/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const AwaitDependenciesInitFragment = require("../async-modules/AwaitDependenciesInitFragment");
const isGeneratorLowered = require("../async-modules/isGeneratorLowered");
const ModuleDependency = require("../dependencies/core/ModuleDependency");
const Dependency = require("../graph/Dependency");
const { isInlinedUsedName } = require("../optimize/InlineExports");
const InitFragment = require("../template/InitFragment");
const Template = require("../template/Template");
const makeSerializable = require("../util/makeSerializable");
const { propertyAccess } = require("../util/property");

/** @import { ReplaceSource } from "webpack-sources" */
/**
 * @import {
 * 	DependencyKinds,
 * 	ReferencedExports,
 * 	UpdateHashContext,
 * 	ExportInfoName
 * } from "../graph/Dependency"
 */
/** @import { DependencyTemplateContext } from "../template/DependencyTemplate" */
/** @import ModuleGraph from "../graph/ModuleGraph" */
/** @import ModuleGraphConnection from "../graph/ModuleGraphConnection" */
/** @import { Range } from "../javascript/JavascriptParser" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, ExportInfoName[]]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, ExportInfoName[]]>} ObjectSerializerContext */
/** @import Hash from "../util/Hash" */
/** @import { RuntimeSpec } from "../util/runtime" */

class ProvidedDependency extends ModuleDependency {
	/**
	 * Creates an instance of ProvidedDependency.
	 * @param {string} request request
	 * @param {string} identifier identifier
	 * @param {ExportInfoName[]} ids ids
	 * @param {Range} range range
	 */
	constructor(request, identifier, ids, range) {
		super(request);
		/** @type {string} */
		this.identifier = identifier;
		/** @type {string[]} */
		this.ids = ids;
		this.range = range;
		/** @type {undefined | string} */
		this._hashUpdate = undefined;
	}

	get type() {
		return "provided";
	}

	get category() {
		return "esm";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		const ids = this.ids;
		if (ids.length === 0) return Dependency.EXPORTS_OBJECT_REFERENCED;
		return [ids];
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		if (this._hashUpdate === undefined) {
			this._hashUpdate = this.identifier + (this.ids ? this.ids.join(",") : "");
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.identifier).write(this.ids);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.identifier = context.read();
		const c1 = context.rest;
		this.ids = c1.read();
		super.deserialize(c1.rest);
	}
}

/** @type {Set<keyof DependencyKinds>} */
ProvidedDependency.KINDS = new Set([...ModuleDependency.KINDS, "provided"]);

makeSerializable(ProvidedDependency, [
	"webpack/lib/provide/ProvidedDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/ProvidedDependency"
]);

class ProvidedDependencyTemplate extends ModuleDependency.Template {
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
			runtime,
			runtimeTemplate,
			moduleGraph,
			chunkGraph,
			initFragments,
			runtimeRequirements
		}
	) {
		const dep = /** @type {ProvidedDependency} */ (dependency);
		const connection =
			/** @type {ModuleGraphConnection} */
			(moduleGraph.getConnection(dep));
		const exportsInfo = moduleGraph.getExportsInfo(connection.module);
		const usedName = exportsInfo.getUsedName(dep.ids, runtime);

		const moduleRaw = runtimeTemplate.moduleRaw({
			module: moduleGraph.getModule(dep),
			chunkGraph,
			request: dep.request,
			runtimeRequirements
		});

		// An async module only exposes its exports once awaited, and only an ESM
		// consumer is async itself (see `InferAsyncModulesPlugin`).
		const isAsync =
			moduleGraph.isAsync(connection.module) && moduleGraph.isAsync(module);
		const target = isAsync ? dep.identifier : moduleRaw;
		const provided = !usedName
			? target
			: isInlinedUsedName(usedName)
				? `(${target}, ${usedName.render(
						Template.toNormalComment(
							`inlined export ${propertyAccess(dep.ids)}`
						)
					)})`
				: `${target}${propertyAccess(/** @type {string[]} */ (usedName), 0)}`;

		initFragments.push(
			new InitFragment(
				`/* provided dependency */ var ${dep.identifier} = ${
					isAsync ? moduleRaw : provided
				};\n`,
				InitFragment.STAGE_PROVIDES,
				1,
				`provided ${dep.identifier}`
			)
		);
		if (isAsync) {
			initFragments.push(
				new AwaitDependenciesInitFragment(
					new Map([[dep.identifier, dep.identifier]]),
					isGeneratorLowered(module, moduleGraph, runtimeTemplate)
				)
			);
			if (provided !== target) {
				initFragments.push(
					new InitFragment(
						`${dep.identifier} = ${provided};\n`,
						InitFragment.STAGE_ASYNC_ESM_IMPORTS,
						1,
						`provided async ${dep.identifier}`
					)
				);
			}
		}
		source.replace(dep.range[0], dep.range[1] - 1, dep.identifier);
	}
}

ProvidedDependency.Template = ProvidedDependencyTemplate;

module.exports = ProvidedDependency;
