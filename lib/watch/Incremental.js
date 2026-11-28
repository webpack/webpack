/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Sebastian Beltran @bjohansebas
*/

"use strict";

const ModuleGraph = require("../graph/ModuleGraph");
const asyncLib = require("../util/async");
const { replayOptimizationBailouts } = require("../util/buildDiagnostics");

/** @import Compilation from "../Compilation.js" */
/** @import Compiler from "../Compiler.js" */
/** @import Module from "../module/Module.js" */
/** @import NormalModuleFactory from "../module/NormalModuleFactory.js" */

class Incremental {
	/**
	 * @param {Compilation} compilation current compilation
	 * @param {Compilation | undefined} previous reusable compilation
	 * @param {Map<string, Module>} modulesMap current module identifiers
	 */
	constructor(compilation, previous, modulesMap) {
		this._compilation = compilation;
		this._previous = previous;
		this._modulesMap = modulesMap;
		this.rebuilding = previous !== undefined;
		this.retainedModules = previous ? previous._incremental.modules : undefined;
		/** @type {Set<Module> | undefined} */
		this.modules = undefined;
	}

	/**
	 * @param {Compiler} compiler compiler starting a build
	 * @returns {Compilation | undefined} reusable compilation
	 */
	static getPrevious(compiler) {
		const previous = compiler._lastCompilation;
		return previous && previous._incremental.canReuse() ? previous : undefined;
	}

	/**
	 * Limit the first experiment to source edits without factory invalidation.
	 * @returns {boolean} whether the next build can retain this graph
	 */
	canReuse() {
		const compilation = this._compilation;
		const { compiler, options } = compilation;
		if (
			!compiler.watchMode ||
			!options.experiments.incremental ||
			options.optimization.sideEffects !== false ||
			options.optimization.concatenateModules !== false ||
			options.module.rules.length > 0 ||
			options.module.unsafeCache === true ||
			options.experiments.deferImport ||
			typeof options.entry === "function" ||
			compilation.errors.length > 0 ||
			compilation.children.length > 0 ||
			this.modules === undefined ||
			compiler.modifiedFiles === undefined ||
			compiler.removedFiles === undefined ||
			compiler.removedFiles.size > 0 ||
			compiler.modifiedFiles.size !== 1 ||
			compiler.hooks.make.taps.some((tap) => tap.name !== "EntryPlugin") ||
			compilation.globalEntry.dependencies.length > 0 ||
			compilation.globalEntry.includeDependencies.length > 0
		) {
			return false;
		}
		/** @type {Set<string>} */
		const resources = new Set();
		for (const module of this.modules) {
			if (
				!module.is("normal") ||
				module.loaders.length > 0 ||
				!module.buildInfo ||
				!module.buildInfo.cacheable ||
				module.getSourceTypes().size !== 1 ||
				!module.getSourceTypes().has("javascript")
			) {
				return false;
			}
			const resolveData = module.resourceResolveData;
			if (
				resolveData &&
				resolveData.descriptionFilePath &&
				compiler.modifiedFiles.has(resolveData.descriptionFilePath)
			) {
				return false;
			}
			const resource = module.nameForCondition();
			if (resource) resources.add(resource);
		}
		for (const entry of compilation.entries.values()) {
			if (entry.includeDependencies.length > 0) return false;
		}
		for (const file of compiler.modifiedFiles) {
			if (!resources.has(file)) return false;
		}
		return true;
	}

	/**
	 * Rebuild changed modules before running the static entry hooks.
	 * @param {NormalModuleFactory} normalModuleFactory current module factory
	 * @param {(error?: Error | null) => void} callback completion callback
	 * @returns {void}
	 */
	make(normalModuleFactory, callback) {
		const compilation = this._compilation;
		const previous = this._previous;
		this._previous = undefined;
		if (!previous) {
			return compilation.compiler.hooks.make.callAsync(compilation, callback);
		}
		const { moduleGraph, modules } = compilation;
		moduleGraph.unfreeze();
		for (const module of previous.modules) {
			if (!modules.has(module)) moduleGraph._removeModule(module);
		}
		moduleGraph.removeAllModuleAttributes();
		// Preserve resolution probes for modules whose factories are skipped.
		compilation.fileDependencies.addAll([...previous.fileDependencies]);
		compilation.contextDependencies.addAll([...previous.contextDependencies]);
		compilation.missingDependencies.addAll([...previous.missingDependencies]);
		/** @type {Set<string>} */
		const types = new Set();
		for (const module of modules) {
			types.add(module.type);
			moduleGraph.getOptimizationBailout(module).length = 0;
			const exportsInfo = moduleGraph.getExportsInfo(module);
			exportsInfo._resetProvidedExports();
			exportsInfo._resetUsedExports();
			const meta = moduleGraph.getMetaIfExisting(module);
			if (meta) {
				if (meta.importVarMap) meta.importVarMap.clear();
				if (meta.deferredImportVarMap) meta.deferredImportVarMap.clear();
				meta.liveBindings = undefined;
				meta.liveSetters = undefined;
				meta.onDemandExports = undefined;
				meta.linkedBinding = undefined;
				meta.linkedScope = undefined;
			}
		}
		asyncLib.each(
			[...types],
			(type, done) => normalModuleFactory._prepareModuleType(type, done),
			(error) => {
				if (error) return callback(error);
				for (const module of modules) {
					module._restoreParserAndGenerator(normalModuleFactory);
				}
				asyncLib.eachLimit(
					[...modules],
					1,
					(module, done) => {
						if (compilation.builtModules.has(module)) return done();
						module.needBuild(
							{
								compilation,
								fileSystemInfo: compilation.fileSystemInfo,
								valueCacheVersions: compilation.valueCacheVersions
							},
							(error, needed) => {
								if (error) return done(error);
								if (!needed) return done();
								compilation.rebuildModule(module, done);
							}
						);
					},
					(error) => {
						if (error) return callback(error);
						compilation.compiler.hooks.make.callAsync(compilation, (error) => {
							if (error) return callback(error);
							this._prune();
							for (const module of modules) {
								if (!compilation.buildQueue.isDone(module)) {
									replayOptimizationBailouts(moduleGraph, module);
									compilation.hooks.stillValidModule.call(module);
								}
							}
							callback();
						});
					}
				);
			}
		);
	}

	/**
	 * Remove modules no longer reachable from the static entries.
	 * @returns {void}
	 */
	_prune() {
		const compilation = this._compilation;
		const { moduleGraph } = compilation;
		/** @type {Set<Module>} */
		const reachable = new Set();
		for (const entry of compilation.entries.values()) {
			for (const dependency of entry.dependencies) {
				const module = moduleGraph.getModule(dependency);
				if (module) {
					reachable.add(module);
					moduleGraph.setIssuer(module, null);
				}
			}
		}
		for (const module of reachable) {
			for (const connection of moduleGraph.getOutgoingConnections(module)) {
				if (connection.module && !reachable.has(connection.module)) {
					reachable.add(connection.module);
					moduleGraph.setIssuer(connection.module, module);
				}
			}
		}
		for (const module of compilation.modules) {
			if (reachable.has(module)) continue;
			compilation.modules.delete(module);
			this._modulesMap.delete(module.identifier());
			moduleGraph._removeModule(module);
			ModuleGraph.clearModuleGraphForModule(module);
			module.invalidateBuild();
			module.cleanupForCache();
		}
	}

	/**
	 * Keep only make's modules; seal still runs completely on every build.
	 * @returns {void}
	 */
	capture() {
		if (
			this._compilation.options.experiments.incremental &&
			this.modules === undefined
		) {
			this.modules = new Set(this._compilation.modules);
		}
	}
}

module.exports = Incremental;
