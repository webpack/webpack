/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const HarmonyLinkingError = require("../HarmonyLinkingError");
const InitFragment = require("../InitFragment");
const Template = require("../Template");
const AwaitDependenciesInitFragment = require("../async-modules/AwaitDependenciesInitFragment");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class HarmonyImportDependency extends ModuleDependency {
	/**
	 *
	 * @param {string} request request string
	 * @param {number} sourceOrder source order
	 */
	constructor(request, sourceOrder) {
		super(request);
		this.sourceOrder = sourceOrder;
	}

	get category() {
		return "esm";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {(string[] | ReferencedExport)[]} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return Dependency.NO_EXPORTS_REFERENCED;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {string} name of the variable for the import
	 */
	getImportVar(moduleGraph) {
		const module = moduleGraph.getParentModule(this);
		const meta = moduleGraph.getMeta(module);
		let importVarMap = meta.importVarMap;
		if (!importVarMap) meta.importVarMap = importVarMap = new Map();
		let importVar = importVarMap.get(moduleGraph.getModule(this));
		if (importVar) return importVar;
		importVar = `${Template.toIdentifier(
			`${this.userRequest}`
		)}__WEBPACK_IMPORTED_MODULE_${importVarMap.size}__`;
		importVarMap.set(moduleGraph.getModule(this), importVar);
		return importVar;
	}

	/**
	 * @param {boolean} update create new variables or update existing one
	 * @param {DependencyTemplateContext} templateContext the template context
	 * @returns {[string, string]} the import statement and the compat statement
	 */
	getImportStatement(
		update,
		{ runtimeTemplate, module, moduleGraph, chunkGraph, runtimeRequirements }
	) {
		return runtimeTemplate.importStatement({
			update,
			module: moduleGraph.getModule(this),
			chunkGraph,
			importVar: this.getImportVar(moduleGraph),
			request: this.request,
			originModule: module,
			runtimeRequirements
		});
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {string[]} ids imported ids
	 * @param {string} additionalMessage extra info included in the error message
	 * @returns {WebpackError[] | undefined} errors
	 */
	getLinkingErrors(moduleGraph, ids, additionalMessage) {
		const importedModule = moduleGraph.getModule(this);
		// ignore errors for missing or failed modules
		if (!importedModule || importedModule.getNumberOfErrors() > 0) {
			return;
		}

		const parentModule = moduleGraph.getParentModule(this);
		const exportsType = importedModule.getExportsType(
			moduleGraph,
			parentModule.buildMeta.strictHarmonyModule
		);
		switch (exportsType) {
			case "default-only":
				// It's has only a default export
				if (ids.length > 0 && ids[0] !== "default") {
					// In strict harmony modules we only support the default export
					return [
						new HarmonyLinkingError(
							`Can't import the named export ${ids
								.map(id => `'${id}'`)
								.join(
									"."
								)} ${additionalMessage} from default-exporting module (only default export is available)`
						)
					];
				}
				return;
			case "default-with-named":
				// It has a default export and named properties redirect
				// In some cases we still want to warn here
				if (
					ids.length > 0 &&
					ids[0] !== "default" &&
					importedModule.buildMeta.defaultObject === "redirect-warn"
				) {
					// For these modules only the default export is supported
					return [
						new HarmonyLinkingError(
							`Should not import the named export ${ids
								.map(id => `'${id}'`)
								.join(
									"."
								)} ${additionalMessage} from default-exporting module (only default export is available soon)`
						)
					];
				}
				return;
			case "namespace": {
				if (ids.length === 0) {
					return;
				}

				if (moduleGraph.isExportProvided(importedModule, ids) !== false) {
					// It's provided or we are not sure
					return;
				}

				let pos = 0;
				let exportsInfo = moduleGraph.getExportsInfo(importedModule);
				while (pos < ids.length && exportsInfo) {
					const id = ids[pos++];
					const exportInfo = exportsInfo.getReadOnlyExportInfo(id);
					if (exportInfo.provided === false) {
						// We are sure that it's not provided
						const providedExports = exportsInfo.getProvidedExports();
						const moreInfo = Array.isArray(providedExports)
							? ` (possible exports: ${providedExports.join(", ")})`
							: " (possible exports unknown)";
						return [
							new HarmonyLinkingError(
								`export ${ids
									.slice(0, pos)
									.map(id => `'${id}'`)
									.join(".")} ${additionalMessage} was not found in '${
									this.userRequest
								}'${moreInfo}`
							)
						];
					}
					exportsInfo = exportInfo.getNestedExportsInfo();
				}

				// We are sure that it's not provided
				return [
					new HarmonyLinkingError(
						`export ${ids
							.map(id => `'${id}'`)
							.join(".")} ${additionalMessage} was not found in '${
							this.userRequest
						}'`
					)
				];
			}
		}
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		const { chunkGraph } = context;
		const { moduleGraph } = chunkGraph;
		super.updateHash(hash, context);
		const importedModule = moduleGraph.getModule(this);
		if (importedModule) {
			const parentModule = moduleGraph.getParentModule(this);
			hash.update(
				importedModule.getExportsType(
					moduleGraph,
					parentModule.buildMeta && parentModule.buildMeta.strictHarmonyModule
				)
			);
			if (moduleGraph.isAsync(importedModule)) hash.update("async");
		}
		hash.update(`${this.sourceOrder}`);
	}

	serialize(context) {
		const { write } = context;
		write(this.sourceOrder);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.sourceOrder = read();
		super.deserialize(context);
	}
}

module.exports = HarmonyImportDependency;

const importEmittedMap = new WeakMap();

HarmonyImportDependency.Template = class HarmonyImportDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyImportDependency} */ (dependency);
		const { module, moduleGraph, runtime } = templateContext;

		const connection = moduleGraph.getConnection(dep);
		if (connection && !connection.isActive(runtime)) return;

		const referencedModule = connection && connection.module;
		const moduleKey = referencedModule
			? referencedModule.identifier()
			: dep.request;
		const key = `harmony import ${moduleKey}`;

		if (module) {
			let emittedModules = importEmittedMap.get(dep);
			if (emittedModules === undefined) {
				emittedModules = new WeakSet();
				importEmittedMap.set(dep, emittedModules);
			}
			emittedModules.add(module);
		}

		const importStatement = dep.getImportStatement(false, templateContext);
		if (templateContext.moduleGraph.isAsync(referencedModule)) {
			templateContext.initFragments.push(
				new InitFragment(
					importStatement[0],
					InitFragment.STAGE_HARMONY_IMPORTS,
					dep.sourceOrder,
					key
				)
			);
			templateContext.initFragments.push(
				new AwaitDependenciesInitFragment(
					new Set([dep.getImportVar(templateContext.moduleGraph)])
				)
			);
			templateContext.initFragments.push(
				new InitFragment(
					importStatement[1],
					InitFragment.STAGE_ASYNC_HARMONY_IMPORTS,
					dep.sourceOrder,
					key + " compat"
				)
			);
		} else {
			templateContext.initFragments.push(
				new InitFragment(
					importStatement[0] + importStatement[1],
					InitFragment.STAGE_HARMONY_IMPORTS,
					dep.sourceOrder,
					key
				)
			);
		}
	}

	/**
	 *
	 * @param {Dependency} dep the dependency
	 * @param {Module} module the module
	 * @returns {boolean} true, when for this dependency and module a import init fragment was created
	 */
	static isImportEmitted(dep, module) {
		const emittedModules = importEmittedMap.get(dep);
		return emittedModules !== undefined && emittedModules.has(module);
	}
};
