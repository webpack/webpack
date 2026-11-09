/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { cssExportConvention, gridAreaName } = require("../../css/conventions");
const WebpackError = require("../../errors/WebpackError");
const Dependency = require("../../graph/Dependency");
const isDependencyKind = require("../../graph/isDependencyKind");
const makeSerializable = require("../../util/makeSerializable");
const CssIcssExportDependency = require("./CssIcssExportDependency");
const CssImportDependency = require("./CssImportDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import { ReferencedExports, DependencyKinds, TRANSITIVE, UpdateHashContext } from "../../graph/Dependency" */
/** @import Hash from "../../util/Hash" */
/** @import { NormalModuleBuildInfo } from "../../module/NormalModule" */
/**
 * @import {
 * 	CssDependencyTemplateContext as DependencyTemplateContext
 * } from "../../template/DependencyTemplate"
 */
/** @import CssGenerator from "../../css/CssGenerator" */
/** @import CssModule from "../../css/CssModule" */
/** @import ModuleGraph from "../../graph/ModuleGraph" */
/** @import { RuntimeSpec } from "../../util/runtime" */
/** @import { Range } from "../../javascript/JavascriptParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, string]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[string, string]>} ObjectSerializerContext */
/**
 * @import {
 * 	CssGeneratorExportsConvention
 * } from "../../../declarations/WebpackOptions"
 */

/**
 * Whether `module` declares the grid area or line a grid name implicitly selects (`a-start` from area `a`, `a` from line `a-start`), which an import of it resolves to.
 * @param {CssModule} module module the name is imported from
 * @param {string} name imported name
 * @returns {boolean} true when the implicit area or line is declared there
 */
const declaresImplicitGridName = (module, name) => {
	const area = gridAreaName(name);
	const candidates = area !== name ? [area] : [`${name}-start`, `${name}-end`];
	for (const dependency of module.dependencies) {
		if (!isDependencyKind(dependency, "css-icss-export")) continue;
		const entriesByName = dependency.getEntriesByName();
		return candidates.some((candidate) => {
			const entries = entriesByName.get(candidate);
			return (
				entries !== undefined &&
				entries.some(
					(entry) =>
						entry.exportType ===
						CssIcssExportDependency.EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER
				)
			);
		});
	}
	return false;
};

class CssIcssImportDependency extends CssImportDependency {
	/**
	 * Example of dependency:
	 *
	 * :import('./style.css') { value: name }
	 * @param {string} request request request path which needs resolving
	 * @param {Range} range the range of dependency
	 * @param {"local" | "global"} mode mode of the parsed CSS
	 * @param {string} importName import name (`name` from example)
	 * @param {string} localName local name (`value` from example)
	 */
	constructor(request, range, mode, importName, localName) {
		super(request, range, mode);
		/** @type {string} */
		this.importName = importName;
		/** @type {string} */
		this.localName = localName;
		/** @type {undefined | string[]} */
		this._importNameConventionNames = undefined;
	}

	/**
	 * Memoized `cssExportConvention(this.importName, convention)`. The target
	 * module is fixed for a given dep, so its `exportsConvention` is fixed,
	 * so the convention-derived aliases of `importName` can be cached on the dep.
	 * @param {CssGeneratorExportsConvention} convention convention from the target module's generator
	 * @returns {string[]} convention results
	 */
	getImportNameConventionNames(convention) {
		if (this._importNameConventionNames) {
			return this._importNameConventionNames;
		}
		this._importNameConventionNames = cssExportConvention(
			this.importName,
			convention
		);
		return this._importNameConventionNames;
	}

	get type() {
		return "css :import";
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		super.updateHash(hash, context);
		const { moduleGraph } = context.chunkGraph;
		// The imported name is written here, so its modules' builds are part of this hash.
		for (const module of CssIcssExportDependency.Template.resolveModules(
			moduleGraph,
			/** @type {CssModule} */ (moduleGraph.getParentModule(this)),
			this.localName,
			this.importName,
			this.request
		)) {
			const buildInfo = /** @type {NormalModuleBuildInfo | undefined} */ (
				module.buildInfo
			);
			if (buildInfo && buildInfo.hash) hash.update(buildInfo.hash);
		}
	}

	/**
	 * Could affect referencing module.
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		// A value can come through a chain of re-exports.
		return Dependency.TRANSITIVE;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return [
			{
				name: [this.importName],
				canMangle: true
			}
		];
	}

	/**
	 * Returns warnings.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		const module = /** @type {CssModule | undefined} */ (
			moduleGraph.getModule(this)
		);

		if (!module) return null;

		// The target stores exports under its own `exportsConvention`, so asking for
		// the raw name misses under `camel-case-only` or any convention dropping the
		// original spelling. Expand through that convention and accept any alias.
		const generator =
			/** @type {CssGenerator | undefined} */
			(module.generator);
		const convention =
			generator && generator.options && generator.options.exportsConvention;
		const exportsInfo = moduleGraph.getExportsInfo(module);
		const names = convention
			? this.getImportNameConventionNames(convention)
			: [this.importName];
		const isProvided = names.some((name) => exportsInfo.isExportProvided(name));

		if (!isProvided && !declaresImplicitGridName(module, this.importName)) {
			const error = new WebpackError(
				`Referenced name "${this.importName}" in "${this.userRequest}" not found`
			);
			error.module = module;

			return [error];
		}

		return null;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.importName).write(this.localName);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.importName = context.read();
		const c1 = context.rest;
		this.localName = c1.read();
		super.deserialize(c1.rest);
	}
}

CssIcssImportDependency.Template = class CssIcssImportDependencyTemplate extends (
	CssImportDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		// Nothing
	}
};

makeSerializable(CssIcssImportDependency, [
	"webpack/lib/dependencies/css/CssIcssImportDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/CssIcssImportDependency"
]);

/** @type {Set<keyof DependencyKinds>} */
CssIcssImportDependency.KINDS = new Set([
	...CssImportDependency.KINDS,
	"css-icss-import"
]);

module.exports = CssIcssImportDependency;
