/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const ModuleGraphConnection = require("./ModuleGraphConnection");

/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleProfile")} ModuleProfile */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @template T @typedef {import("./util/SortableSet")<T>} SortableSet<T> */

/**
 * @callback OptimizationBailoutFunction
 * @param {RequestShortener} requestShortener
 * @returns {string}
 */

class ExportsInfo {
	constructor() {
		/** @type {Map<string, ExportInfo>} */
		this._exports = new Map();
		this._otherExportsInfo = new ExportInfo(null);
		this._exportsIsOrdered = false;
	}

	get exports() {
		return this._exports.values();
	}

	get otherExportsInfo() {
		return this._otherExportsInfo;
	}

	_sortExports() {
		const newMap = new Map();
		for (const name of Array.from(this._exports.keys()).sort()) {
			newMap.set(name, this._exports.get(name));
		}
		this._exports = newMap;
		this._exportsIsOrdered = true;
	}

	setHasProvideInfo() {
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.provided === undefined) {
				exportInfo.provided = false;
			}
			if (exportInfo.canMangle === undefined) {
				exportInfo.canMangle = true;
			}
		}
		if (this._otherExportsInfo.provided === undefined) {
			this._otherExportsInfo.provided = false;
		}
		if (this._otherExportsInfo.canMangle === undefined) {
			this._otherExportsInfo.canMangle = true;
		}
	}

	getExportInfo(name) {
		const info = this._exports.get(name);
		if (info !== undefined) return info;
		const newInfo = new ExportInfo(name, this._otherExportsInfo);
		this._exports.set(name, newInfo);
		this._exportsIsOrdered = false;
		return newInfo;
	}

	getReadOnlyExportInfo(name) {
		const info = this._exports.get(name);
		if (info !== undefined) return info;
		return this._otherExportsInfo;
	}

	/**
	 * @returns {boolean} true, if this call changed something
	 */
	setUnknownExportsProvided() {
		let changed = false;
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.provided !== true && exportInfo.provided !== null) {
				exportInfo.provided = null;
				changed = true;
			}
			if (exportInfo.canMangle !== false) {
				exportInfo.canMangle = false;
				changed = true;
			}
		}
		if (
			this._otherExportsInfo.provided !== true &&
			this._otherExportsInfo.provided !== null
		) {
			this._otherExportsInfo.provided = null;
			changed = true;
		}
		if (this._otherExportsInfo.canMangle !== false) {
			this._otherExportsInfo.canMangle = false;
			changed = true;
		}
		return changed;
	}

	getProvidedExports() {
		switch (this._otherExportsInfo.provided) {
			case undefined:
				return null;
			case null:
				return true;
			case true:
				return true;
		}
		const array = [];
		if (!this._exportsIsOrdered) this._sortExports();
		for (const exportInfo of this._exports.values()) {
			switch (exportInfo.provided) {
				case undefined:
					return null;
				case null:
					return true;
				case true:
					array.push(exportInfo.name);
			}
		}
		return array;
	}

	isExportProvided(name) {
		let info = this._exports.get(name);
		if (info === undefined) info = this._otherExportsInfo;
		return info.provided;
	}

	getRestoreProvidedData() {
		const otherProvided = this._otherExportsInfo.provided;
		const otherCanMangle = this._otherExportsInfo.canMangle;
		const exports = [];
		for (const exportInfo of this._exports.values()) {
			if (
				exportInfo.provided !== otherProvided ||
				exportInfo.canMangle !== otherCanMangle
			) {
				exports.push({
					name: exportInfo.name,
					provided: exportInfo.provided,
					canMangle: exportInfo.canMangle
				});
			}
		}
		return {
			exports,
			otherProvided,
			otherCanMangle
		};
	}

	restoreProvided({ otherProvided, otherCanMangle, exports }) {
		for (const exportInfo of this._exports.values()) {
			exportInfo.provided = otherProvided;
			exportInfo.canMangle = otherCanMangle;
		}
		this._otherExportsInfo.provided = otherProvided;
		this._otherExportsInfo.canMangle = otherCanMangle;
		for (const exp of exports) {
			const exportInfo = this.getExportInfo(exp.name);
			exportInfo.provided = exp.provided;
			exportInfo.canMangle = exp.canMangle;
		}
	}
}

class ExportInfo {
	/**
	 * @param {string} name the original name of the export
	 * @param {ExportInfo=} initFrom init values from this ExportInfo
	 */
	constructor(name, initFrom) {
		/** @type {string} */
		this.name = name;
		/**
		 * true: it is provided
		 * false: it is not provided
		 * null: only the runtime knows if it is provided
		 * undefined: it was not determined if it is provided
		 * @type {boolean | null | undefined}
		 */
		this.provided = initFrom ? initFrom.provided : undefined;
		/**
		 * true: it can be mangled
		 * false: is can not be mangled
		 * undefined: it was not determined if it can be mangled
		 * @type {boolean | undefined}
		 */
		this.canMangle = initFrom ? initFrom.canMangle : undefined;
	}

	getUsedInfo() {
		return "no usage info";
	}

	getProvidedInfo() {
		switch (this.provided) {
			case undefined:
				return "no provided info";
			case null:
				return "maybe provided (runtime-defined)";
			case true:
				return "provided";
			case false:
				return "not provided";
		}
	}

	getCanMangleInfo() {
		switch (this.canMangle) {
			case undefined:
				return "can not be renamed (no info)";
			case true:
				return "can be renamed";
			case false:
				return "can not be renamed";
		}
	}
}

class ModuleGraphModule {
	constructor() {
		/** @type {Set<ModuleGraphConnection>} */
		this.incomingConnections = new Set();
		/** @type {Set<ModuleGraphConnection>} */
		this.outgoingConnections = new Set();
		/** @type {Module | null} */
		this.issuer = undefined;
		/** @type {(string | OptimizationBailoutFunction)[]} */
		this.optimizationBailout = [];
		/** @type {ExportsInfo} */
		this.exports = new ExportsInfo();
		/** @type {false | true | SortableSet<string> | null} */
		this.usedExports = null;
		/** @type {number} */
		this.preOrderIndex = null;
		/** @type {number} */
		this.postOrderIndex = null;
		/** @type {number} */
		this.depth = null;
		/** @type {ModuleProfile} */
		this.profile = undefined;
	}
}

class ModuleGraphDependency {
	constructor() {
		/** @type {ModuleGraphConnection} */
		this.connection = undefined;
		/** @type {Module} */
		this.parentModule = undefined;
		/** @type {DependenciesBlock} */
		this.parentBlock = undefined;
	}
}

class ModuleGraph {
	constructor() {
		/** @type {Map<Dependency, ModuleGraphDependency>} */
		this._dependencyMap = new Map();
		/** @type {Map<Module, ModuleGraphModule>} */
		this._moduleMap = new Map();
		/** @type {Map<Module, Set<ModuleGraphConnection>>} */
		this._originMap = new Map();
		/** @type {Map<any, Object>} */
		this._metaMap = new Map();
	}

	/**
	 * @param {Module} module the module
	 * @returns {ModuleGraphModule} the internal module
	 */
	_getModuleGraphModule(module) {
		let mgm = this._moduleMap.get(module);
		if (mgm === undefined) {
			mgm = new ModuleGraphModule();
			this._moduleMap.set(module, mgm);
		}
		return mgm;
	}

	/**
	 * @param {Dependency} dependency the dependency
	 * @returns {ModuleGraphDependency} the internal dependency
	 */
	_getModuleGraphDependency(dependency) {
		let mgd = this._dependencyMap.get(dependency);
		if (mgd === undefined) {
			mgd = new ModuleGraphDependency();
			this._dependencyMap.set(dependency, mgd);
		}
		return mgd;
	}

	/**
	 * @param {Dependency} dependency the dependency
	 * @param {DependenciesBlock} block parent block
	 * @param {Module} module parent module
	 * @returns {void}
	 */
	setParents(dependency, block, module) {
		const mgd = this._getModuleGraphDependency(dependency);
		mgd.parentBlock = block;
		mgd.parentModule = module;
	}

	/**
	 * @param {Dependency} dependency the dependency
	 * @returns {Module} parent module
	 */
	getParentModule(dependency) {
		const mgd = this._getModuleGraphDependency(dependency);
		return mgd.parentModule;
	}

	/**
	 * @param {Dependency} dependency the dependency
	 * @returns {DependenciesBlock} parent block
	 */
	getParentBlock(dependency) {
		const mgd = this._getModuleGraphDependency(dependency);
		return mgd.parentBlock;
	}

	/**
	 * @param {Module} originModule the referencing module
	 * @param {Dependency} dependency the referencing dependency
	 * @param {Module} module the referenced module
	 * @returns {void}}
	 */
	setResolvedModule(originModule, dependency, module) {
		const connection = new ModuleGraphConnection(
			originModule,
			dependency,
			module
		);
		const mgd = this._getModuleGraphDependency(dependency);
		mgd.connection = connection;
		const connections = this._getModuleGraphModule(module).incomingConnections;
		connections.add(connection);
		const originConnections = this._getModuleGraphModule(originModule)
			.outgoingConnections;
		originConnections.add(connection);
	}

	/**
	 * @param {Dependency} dependency the referencing dependency
	 * @param {Module} module the referenced module
	 * @returns {void}
	 */
	updateModule(dependency, module) {
		const { connection } = this._getModuleGraphDependency(dependency);
		if (connection.module === module) return;
		const oldMgm = this._getModuleGraphModule(connection.module);
		oldMgm.incomingConnections.delete(connection);
		connection.module = module;
		const newMgm = this._getModuleGraphModule(module);
		newMgm.incomingConnections.add(connection);
	}

	/**
	 * @param {Dependency} dependency the referencing dependency
	 * @param {string} explanation an explanation
	 * @returns {void}
	 */
	addExplanation(dependency, explanation) {
		const { connection } = this._getModuleGraphDependency(dependency);
		connection.addExplanation(explanation);
	}

	/**
	 * @param {Module} sourceModule the source module
	 * @param {Module} targetModule the target module
	 * @returns {void}
	 */
	cloneModuleAttributes(sourceModule, targetModule) {
		const oldMgm = this._getModuleGraphModule(sourceModule);
		const newMgm = this._getModuleGraphModule(targetModule);
		newMgm.postOrderIndex = oldMgm.postOrderIndex;
		newMgm.preOrderIndex = oldMgm.preOrderIndex;
		newMgm.depth = oldMgm.depth;
		newMgm.usedExports = oldMgm.usedExports;
		// TODO optimize this
		newMgm.exports.restoreProvided(oldMgm.exports.getRestoreProvidedData());
	}

	/**
	 * @param {Module} module the module
	 * @returns {void}
	 */
	removeModuleAttributes(module) {
		const mgm = this._getModuleGraphModule(module);
		mgm.postOrderIndex = null;
		mgm.preOrderIndex = null;
		mgm.depth = null;
	}

	/**
	 * @returns {void}
	 */
	removeAllModuleAttributes() {
		for (const mgm of this._moduleMap.values()) {
			mgm.postOrderIndex = null;
			mgm.preOrderIndex = null;
			mgm.depth = null;
		}
	}

	/**
	 * @param {Module} oldModule the old referencing module
	 * @param {Module} newModule the new referencing module
	 * @param {function(ModuleGraphConnection): boolean} filterConnection filter predicate for replacement
	 * @returns {void}
	 */
	moveModuleConnections(oldModule, newModule, filterConnection) {
		if (oldModule === newModule) return;
		const oldMgm = this._getModuleGraphModule(oldModule);
		const newMgm = this._getModuleGraphModule(newModule);
		// Outgoing connections
		const oldConnections = oldMgm.outgoingConnections;
		const newConnections = newMgm.outgoingConnections;
		for (const connection of oldConnections) {
			if (filterConnection(connection)) {
				connection.originModule = newModule;
				newConnections.add(connection);
				oldConnections.delete(connection);
			}
		}
		// Incoming connections
		const oldConnections2 = oldMgm.incomingConnections;
		const newConnections2 = newMgm.incomingConnections;
		for (const connection of oldConnections2) {
			if (filterConnection(connection)) {
				connection.module = newModule;
				newConnections2.add(connection);
				oldConnections2.delete(connection);
			}
		}
	}

	/**
	 * @param {Module} module the referenced module
	 * @param {string} explanation an explanation why it's referenced
	 * @returns {void}
	 */
	addExtraReason(module, explanation) {
		const connections = this._getModuleGraphModule(module).incomingConnections;
		connections.add(new ModuleGraphConnection(null, null, module, explanation));
	}

	/**
	 * @param {Dependency} dependency the dependency to look for a referenced module
	 * @returns {Module} the referenced module
	 */
	getResolvedModule(dependency) {
		const { connection } = this._getModuleGraphDependency(dependency);
		return connection !== undefined ? connection.resolvedModule : null;
	}

	/**
	 * @param {Dependency} dependency the dependency to look for a referenced module
	 * @returns {ModuleGraphConnection | undefined} the connection
	 */
	getConnection(dependency) {
		const { connection } = this._getModuleGraphDependency(dependency);
		return connection;
	}

	/**
	 * @param {Dependency} dependency the dependency to look for a referenced module
	 * @returns {Module} the referenced module
	 */
	getModule(dependency) {
		const { connection } = this._getModuleGraphDependency(dependency);
		return connection !== undefined ? connection.module : null;
	}

	/**
	 * @param {Dependency} dependency the dependency to look for a referencing module
	 * @returns {Module} the referencing module
	 */
	getOrigin(dependency) {
		const { connection } = this._getModuleGraphDependency(dependency);
		return connection !== undefined ? connection.originModule : null;
	}

	/**
	 * @param {Dependency} dependency the dependency to look for a referencing module
	 * @returns {Module} the original referencing module
	 */
	getResolvedOrigin(dependency) {
		const { connection } = this._getModuleGraphDependency(dependency);
		return connection !== undefined ? connection.resolvedOriginModule : null;
	}

	/**
	 * @param {Module} module the module
	 * @returns {ModuleGraphConnection[]} reasons why a module is included
	 */
	getIncomingConnections(module) {
		const connections = this._getModuleGraphModule(module).incomingConnections;
		return Array.from(connections);
	}

	/**
	 * @param {Module} module the module
	 * @returns {ModuleGraphConnection[]} list of outgoing connections
	 */
	getOutgoingConnections(module) {
		const connections = this._getModuleGraphModule(module).outgoingConnections;
		return Array.from(connections);
	}

	/**
	 * @param {Module} module the module
	 * @returns {ModuleProfile | null} the module profile
	 */
	getProfile(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.profile;
	}

	/**
	 * @param {Module} module the module
	 * @param {ModuleProfile | null} profile the module profile
	 * @returns {void}
	 */
	setProfile(module, profile) {
		const mgm = this._getModuleGraphModule(module);
		mgm.profile = profile;
	}

	/**
	 * @param {Module} module the module
	 * @returns {Module | null} the issuer module
	 */
	getIssuer(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.issuer;
	}

	/**
	 * @param {Module} module the module
	 * @param {Module | null} issuer the issuer module
	 * @returns {void}
	 */
	setIssuer(module, issuer) {
		const mgm = this._getModuleGraphModule(module);
		mgm.issuer = issuer;
	}

	/**
	 * @param {Module} module the module
	 * @returns {(string | OptimizationBailoutFunction)[]} optimization bailouts
	 */
	getOptimizationBailout(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.optimizationBailout;
	}

	/**
	 * @param {Module} module the module
	 * @returns {true | string[] | null} the provided exports
	 */
	getProvidedExports(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.exports.getProvidedExports();
	}

	/**
	 * @param {Module} module the module
	 * @param {string} exportName a name of an export
	 * @returns {boolean | null} true, if the export is provided by the module.
	 *                           null, if it's unknown.
	 *                           false, if it's not provided.
	 */
	isExportProvided(module, exportName) {
		const mgm = this._getModuleGraphModule(module);
		const result = mgm.exports.isExportProvided(exportName);
		return result === undefined ? null : result;
	}

	/**
	 * @param {Module} module the module
	 * @returns {ExportsInfo} info about the exports
	 */
	getExportsInfo(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.exports;
	}

	/**
	 * @param {Module} module the module
	 * @param {string} exportName the export
	 * @returns {ExportInfo} info about the export
	 */
	getExportInfo(module, exportName) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.exports.getExportInfo(exportName);
	}

	/**
	 * @param {Module} module the module
	 * @returns {false | true | SortableSet<string> | null} the used exports
	 * false: module is not used at all.
	 * true: the module namespace/object export is used.
	 * SortableSet<string>: these export names are used.
	 * empty SortableSet<string>: module is used but no export.
	 * null: unknown, worst case should be assumed.
	 */
	getUsedExports(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.usedExports;
	}

	/**
	 * @param {Module} module the module
	 * @param {false | true | SortableSet<string>} usedExports the used exports
	 * @returns {void}
	 */
	setUsedExports(module, usedExports) {
		const mgm = this._getModuleGraphModule(module);
		mgm.usedExports = usedExports;
	}

	/**
	 * @param {Module} module the module
	 * @returns {number} the index of the module
	 */
	getPreOrderIndex(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.preOrderIndex;
	}

	/**
	 * @param {Module} module the module
	 * @returns {number} the index of the module
	 */
	getPostOrderIndex(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.postOrderIndex;
	}

	/**
	 * @param {Module} module the module
	 * @param {number} index the index of the module
	 * @returns {void}
	 */
	setPreOrderIndex(module, index) {
		const mgm = this._getModuleGraphModule(module);
		mgm.preOrderIndex = index;
	}

	/**
	 * @param {Module} module the module
	 * @param {number} index the index of the module
	 * @returns {boolean} true, if the index was set
	 */
	setPreOrderIndexIfUnset(module, index) {
		const mgm = this._getModuleGraphModule(module);
		if (mgm.preOrderIndex === null) {
			mgm.preOrderIndex = index;
			return true;
		}
		return false;
	}

	/**
	 * @param {Module} module the module
	 * @param {number} index the index of the module
	 * @returns {void}
	 */
	setPostOrderIndex(module, index) {
		const mgm = this._getModuleGraphModule(module);
		mgm.postOrderIndex = index;
	}

	/**
	 * @param {Module} module the module
	 * @param {number} index the index of the module
	 * @returns {boolean} true, if the index was set
	 */
	setPostOrderIndexIfUnset(module, index) {
		const mgm = this._getModuleGraphModule(module);
		if (mgm.postOrderIndex === null) {
			mgm.postOrderIndex = index;
			return true;
		}
		return false;
	}

	/**
	 * @param {Module} module the module
	 * @returns {number} the depth of the module
	 */
	getDepth(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.depth;
	}

	/**
	 * @param {Module} module the module
	 * @param {number} depth the depth of the module
	 * @returns {void}
	 */
	setDepth(module, depth) {
		const mgm = this._getModuleGraphModule(module);
		mgm.depth = depth;
	}

	/**
	 * @param {Module} module the module
	 * @param {number} depth the depth of the module
	 * @returns {boolean} true, if the depth was set
	 */
	setDepthIfLower(module, depth) {
		const mgm = this._getModuleGraphModule(module);
		if (mgm.depth === null || mgm.depth > depth) {
			mgm.depth = depth;
			return true;
		}
		return false;
	}

	/**
	 * @param {any} thing any thing
	 * @returns {Object} metadata
	 */
	getMeta(thing) {
		let meta = this._metaMap.get(thing);
		if (meta === undefined) {
			meta = Object.create(null);
			this._metaMap.set(thing, meta);
		}
		return meta;
	}

	// TODO remove in webpack 6
	/**
	 * @param {Module} module the module
	 * @param {string} deprecateMessage message for the deprecation message
	 * @returns {ModuleGraph} the module graph
	 */
	static getModuleGraphForModule(module, deprecateMessage) {
		const fn = deprecateMap.get(deprecateMessage);
		if (fn) return fn(module);
		const newFn = util.deprecate(
			/**
			 * @param {Module} module the module
			 * @returns {ModuleGraph} the module graph
			 */
			module => {
				const moduleGraph = moduleGraphForModuleMap.get(module);
				if (!moduleGraph)
					throw new Error(
						deprecateMessage +
							"There was no ModuleGraph assigned to the Module for backward-compat (Use the new API)"
					);
				return moduleGraph;
			},
			deprecateMessage + ": Use new ModuleGraph API"
		);
		deprecateMap.set(deprecateMessage, newFn);
		return newFn(module);
	}

	// TODO remove in webpack 6
	/**
	 * @param {Module} module the module
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {void}
	 */
	static setModuleGraphForModule(module, moduleGraph) {
		moduleGraphForModuleMap.set(module, moduleGraph);
	}
}

// TODO remove in webpack 6
/** @type {WeakMap<Module, ModuleGraph>} */
const moduleGraphForModuleMap = new WeakMap();

// TODO remove in webpack 6
/** @type {Map<string, (module: Module) => ModuleGraph>} */
const deprecateMap = new Map();

module.exports = ModuleGraph;
module.exports.ModuleGraphConnection = ModuleGraphConnection;
