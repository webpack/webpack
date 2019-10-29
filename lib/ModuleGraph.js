/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const ModuleGraphConnection = require("./ModuleGraphConnection");
const SortableSet = require("./util/SortableSet");

/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleProfile")} ModuleProfile */
/** @typedef {import("./RequestShortener")} RequestShortener */

/**
 * @callback OptimizationBailoutFunction
 * @param {RequestShortener} requestShortener
 * @returns {string}
 */

/** @typedef {0|1|2|3|4} UsageStateType */

const UsageState = Object.freeze({
	NoInfo: /** @type {0} */ (0),
	Unused: /** @type {1} */ (1),
	Unknown: /** @type {2} */ (2),
	OnlyPropertiesUsed: /** @type {3} */ (3),
	Used: /** @type {4} */ (4)
});

class ExportsInfo {
	constructor() {
		/** @type {Map<string, ExportInfo>} */
		this._exports = new Map();
		this._otherExportsInfo = new ExportInfo(null);
		this._sideEffectsOnlyInfo = new ExportInfo("*side effects only*");
		this._exportsAreOrdered = false;
	}

	setTo(exportsInfo) {
		this._otherExportsInfo = new ExportInfo(
			null,
			exportsInfo._otherExportsInfo
		);
		this._sideEffectsOnlyInfo = new ExportInfo(
			"*side effects only*",
			exportsInfo._sideEffectsOnlyInfo
		);
		this._exportsAreOrdered = exportsInfo._exportsAreOrdered;
		this._exports.clear();
		for (const exportInfo of exportsInfo.exports) {
			this._exports.set(
				exportInfo.name,
				new ExportInfo(exportInfo.name, exportInfo)
			);
		}
	}

	get exports() {
		return this._exports.values();
	}

	get orderedExports() {
		if (!this._exportsAreOrdered) {
			this._sortExports();
		}
		return this._exports.values();
	}

	get otherExportsInfo() {
		return this._otherExportsInfo;
	}

	_sortExports() {
		const exports = this._exports;
		if (exports.size > 1) {
			const entriesInOrder = Array.from(exports.values());
			if (
				entriesInOrder.length !== 2 ||
				entriesInOrder[0].name > entriesInOrder[1].name
			) {
				entriesInOrder.sort((a, b) => {
					return a.name < b.name ? -1 : 1;
				});
				exports.clear();
				for (const entry of entriesInOrder) {
					exports.set(entry.name, entry);
				}
			}
		}
		this._exportsAreOrdered = true;
	}

	setHasProvideInfo() {
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.provided === undefined) {
				exportInfo.provided = false;
			}
			if (exportInfo.canMangleProvide === undefined) {
				exportInfo.canMangleProvide = true;
			}
		}
		if (this._otherExportsInfo.provided === undefined) {
			this._otherExportsInfo.provided = false;
		}
		if (this._otherExportsInfo.canMangleProvide === undefined) {
			this._otherExportsInfo.canMangleProvide = true;
		}
	}

	setHasUseInfo() {
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.used === UsageState.NoInfo) {
				exportInfo.used = UsageState.Unused;
			}
			if (exportInfo.canMangleUse === undefined) {
				exportInfo.canMangleUse = true;
			}
		}
		if (this._otherExportsInfo.used === UsageState.NoInfo) {
			this._otherExportsInfo.used = UsageState.Unused;
		}
		if (this._otherExportsInfo.canMangleUse === undefined) {
			this._otherExportsInfo.canMangleUse = true;
		}
		if (this._sideEffectsOnlyInfo.used === UsageState.NoInfo) {
			this._sideEffectsOnlyInfo.used = UsageState.Unused;
		}
	}

	getExportInfo(name) {
		const info = this._exports.get(name);
		if (info !== undefined) return info;
		if (!name)
			throw new Error("ModuleGraph.getExportInfo name must be a valid string");
		const newInfo = new ExportInfo(name, this._otherExportsInfo);
		this._exports.set(name, newInfo);
		this._exportsAreOrdered = false;
		return newInfo;
	}

	getReadOnlyExportInfo(name) {
		const info = this._exports.get(name);
		if (info !== undefined) return info;
		return this._otherExportsInfo;
	}

	/**
	 * @param {string[]=} name the export name
	 * @returns {ExportsInfo | undefined} the nested exports info
	 */
	getNestedExportsInfo(name) {
		if (Array.isArray(name) && name.length > 0) {
			let info = this._exports.get(name[0]);
			if (info === undefined) info = this._otherExportsInfo;
			if (!info.exportsInfo) return undefined;
			return info.exportsInfo.getNestedExportsInfo(name.slice(1));
		}
		return this;
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
			if (exportInfo.canMangleProvide !== false) {
				exportInfo.canMangleProvide = false;
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
		if (this._otherExportsInfo.canMangleProvide !== false) {
			this._otherExportsInfo.canMangleProvide = false;
			changed = true;
		}
		return changed;
	}

	setUsedInUnknownWay() {
		let changed = false;
		if (this._isUsed === false) {
			this._isUsed = true;
			changed = true;
		}
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.used < UsageState.Unknown) {
				exportInfo.used = UsageState.Unknown;
				changed = true;
			}
			if (exportInfo.canMangleUse !== false) {
				exportInfo.canMangleUse = false;
				changed = true;
			}
		}
		if (this._otherExportsInfo.used < UsageState.Unknown) {
			this._otherExportsInfo.used = UsageState.Unknown;
			changed = true;
		}
		if (this._otherExportsInfo.canMangleUse !== false) {
			this._otherExportsInfo.canMangleUse = false;
			changed = true;
		}
		return changed;
	}

	setAllKnownExportsUsed() {
		let changed = false;
		if (this._isUsed === false) {
			this._isUsed = true;
			changed = true;
		}
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.used !== UsageState.Used) {
				exportInfo.used = UsageState.Used;
				changed = true;
			}
		}
		return changed;
	}

	setUsedAsNamedExportType() {
		let changed = false;
		if (this._isUsed === false) {
			this._isUsed = true;
			changed = true;
		}
		this.getExportInfo("default").used = UsageState.Used;
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.used < UsageState.Unknown) {
				exportInfo.used = UsageState.Unknown;
				changed = true;
			}
			if (exportInfo.name !== "default" && exportInfo.canMangleUse !== false) {
				exportInfo.canMangleUse = false;
				changed = true;
			}
		}
		if (this._otherExportsInfo.used < UsageState.Unknown) {
			this._otherExportsInfo.used = UsageState.Unknown;
			changed = true;
		}
		if (this._otherExportsInfo.canMangleUse !== false) {
			this._otherExportsInfo.canMangleUse = false;
			changed = true;
		}
		return changed;
	}

	setUsedForSideEffectsOnly() {
		if (this._sideEffectsOnlyInfo.used === UsageState.Unused) {
			this._sideEffectsOnlyInfo.used = UsageState.Used;
			return true;
		}
		return false;
	}

	isUsed() {
		if (this._otherExportsInfo.used !== UsageState.Unused) {
			return true;
		}
		if (this._sideEffectsOnlyInfo.used !== UsageState.Unused) {
			return true;
		}
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.used !== UsageState.Unused) {
				return true;
			}
		}
		return false;
	}

	getUsedExports() {
		switch (this._otherExportsInfo.used) {
			case UsageState.NoInfo:
				return null;
			case UsageState.Unknown:
				return true;
			case UsageState.OnlyPropertiesUsed:
			case UsageState.Used:
				return true;
		}
		const array = [];
		if (!this._exportsAreOrdered) this._sortExports();
		for (const exportInfo of this._exports.values()) {
			switch (exportInfo.used) {
				case UsageState.NoInfo:
					return null;
				case UsageState.Unknown:
					return true;
				case UsageState.OnlyPropertiesUsed:
				case UsageState.Used:
					array.push(exportInfo.name);
			}
		}
		if (array.length === 0) {
			switch (this._sideEffectsOnlyInfo.used) {
				case UsageState.NoInfo:
					return null;
				case UsageState.Unused:
					return false;
			}
		}
		return new SortableSet(array);
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
		if (!this._exportsAreOrdered) this._sortExports();
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

	/**
	 * @param {string | string[]} name the name of the export
	 * @returns {boolean | undefined | null} if the export is provided
	 */
	isExportProvided(name) {
		if (Array.isArray(name)) {
			let info = this._exports.get(name[0]);
			if (info === undefined) info = this._otherExportsInfo;
			if (info.exportsInfo && name.length > 1) {
				return info.exportsInfo.isExportProvided(name.slice(1));
			}
			return info.provided;
		}
		let info = this._exports.get(name);
		if (info === undefined) info = this._otherExportsInfo;
		return info.provided;
	}

	/**
	 * @param {string | string[]} name export name
	 * @returns {UsageStateType} usage status
	 */
	isExportUsed(name) {
		if (Array.isArray(name)) {
			if (name.length === 0) return this.otherExportsInfo.used;
			let info = this._exports.get(name[0]);
			if (info === undefined) info = this._otherExportsInfo;
			if (info.exportsInfo && name.length > 1) {
				return info.exportsInfo.isExportUsed(name.slice(1));
			}
			return info.used;
		}
		let info = this._exports.get(name);
		if (info === undefined) info = this._otherExportsInfo;
		return info.used;
	}

	/**
	 * @param {string | string[]} name the export name
	 * @returns {string | string[] | false} the used name
	 */
	getUsedName(name) {
		if (Array.isArray(name)) {
			// TODO improve this
			if (name.length === 0) return name;
			let info = this._exports.get(name[0]);
			if (info === undefined) info = this._otherExportsInfo;
			const x = info.getUsedName(name[0]);
			if (!x) return false;
			if (name.length === 1) {
				if (x === name[0]) return name;
				return [x];
			}
			if (info.exportsInfo) {
				const nested = info.exportsInfo.getUsedName(name.slice(1));
				if (!nested) return false;
				return [x].concat(nested);
			} else {
				return [x].concat(name.slice(1));
			}
		} else {
			let info = this._exports.get(name);
			if (info === undefined) info = this._otherExportsInfo;
			return info.getUsedName(name);
		}
	}

	getRestoreProvidedData() {
		const otherProvided = this._otherExportsInfo.provided;
		const otherCanMangleProvide = this._otherExportsInfo.canMangleProvide;
		const exports = [];
		for (const exportInfo of this._exports.values()) {
			if (
				exportInfo.provided !== otherProvided ||
				exportInfo.canMangleProvide !== otherCanMangleProvide
			) {
				exports.push({
					name: exportInfo.name,
					provided: exportInfo.provided,
					canMangleProvide: exportInfo.canMangleProvide
				});
			}
		}
		return {
			exports,
			otherProvided,
			otherCanMangleProvide
		};
	}

	restoreProvided({ otherProvided, otherCanMangleProvide, exports }) {
		for (const exportInfo of this._exports.values()) {
			exportInfo.provided = otherProvided;
			exportInfo.canMangleProvide = otherCanMangleProvide;
		}
		this._otherExportsInfo.provided = otherProvided;
		this._otherExportsInfo.canMangleProvide = otherCanMangleProvide;
		for (const exp of exports) {
			const exportInfo = this.getExportInfo(exp.name);
			exportInfo.provided = exp.provided;
			exportInfo.canMangleProvide = exp.canMangleProvide;
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
		/** @type {string | null} */
		this.usedName = initFrom ? initFrom.usedName : null;
		/** @type {UsageStateType} */
		this.used = initFrom ? initFrom.used : UsageState.NoInfo;
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
		this.canMangleProvide = initFrom ? initFrom.canMangleProvide : undefined;
		/**
		 * true: it can be mangled
		 * false: is can not be mangled
		 * undefined: it was not determined if it can be mangled
		 * @type {boolean | undefined}
		 */
		this.canMangleUse = initFrom ? initFrom.canMangleUse : undefined;
		/** @type {ExportsInfo=} */
		this.exportsInfo = undefined;
	}

	get canMangle() {
		switch (this.canMangleProvide) {
			case undefined:
				return this.canMangleUse === false ? false : undefined;
			case false:
				return false;
			case true:
				switch (this.canMangleUse) {
					case undefined:
						return undefined;
					case false:
						return false;
					case true:
						return true;
				}
		}
		throw new Error(
			`Unexpected flags for canMangle ${this.canMangleProvide} ${this.canMangleUse}`
		);
	}

	getUsedName(fallbackName) {
		if (this.used === UsageState.Unused) return false;
		return this.usedName || this.name || fallbackName;
	}

	getUsedInfo() {
		switch (this.used) {
			case UsageState.NoInfo:
				return "no usage info";
			case UsageState.Unknown:
				return "maybe used (runtime-defined)";
			case UsageState.Used:
				return "used";
			case UsageState.Unused:
				return "unused";
			case UsageState.OnlyPropertiesUsed:
				return "only properties used";
		}
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

	getRenameInfo() {
		switch (this.canMangleProvide) {
			case undefined:
				switch (this.canMangleUse) {
					case undefined:
						return "missing provision and use info prevents renaming";
					case false:
						return "usage prevents renaming (no provision info)";
					case true:
						return "missing provision info prevents renaming";
				}
				break;
			case true:
				switch (this.canMangleUse) {
					case undefined:
						return "missing usage info prevents renaming";
					case false:
						return "usage prevents renaming";
					case true:
						if (this.usedName && this.usedName !== this.name) {
							return `renamed to ${this.usedName}`;
						} else {
							return "can be renamed";
						}
				}
				break;
			case false:
				switch (this.canMangleUse) {
					case undefined:
						return "provision prevents renaming (no use info)";
					case false:
						return "usage and provision prevents renaming";
					case true:
						return "provision prevents renaming";
				}
				break;
		}
		throw new Error(
			`Unexpected flags for getRenameInfo ${this.canMangleProvide} ${this.canMangleUse}`
		);
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
		/** @type {number} */
		this.preOrderIndex = null;
		/** @type {number} */
		this.postOrderIndex = null;
		/** @type {number} */
		this.depth = null;
		/** @type {ModuleProfile} */
		this.profile = undefined;
		/** @type {boolean} */
		this.async = false;
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

		// Caching
		this._cacheModuleGraphModuleKey1 = undefined;
		this._cacheModuleGraphModuleValue1 = undefined;
		this._cacheModuleGraphModuleKey2 = undefined;
		this._cacheModuleGraphModuleValue2 = undefined;
		this._cacheModuleGraphDependencyKey = undefined;
		this._cacheModuleGraphDependencyValue = undefined;
	}

	/**
	 * @param {Module} module the module
	 * @returns {ModuleGraphModule} the internal module
	 */
	_getModuleGraphModule(module) {
		if (this._cacheModuleGraphModuleKey1 === module)
			return this._cacheModuleGraphModuleValue1;
		if (this._cacheModuleGraphModuleKey2 === module)
			return this._cacheModuleGraphModuleValue2;
		let mgm = this._moduleMap.get(module);
		if (mgm === undefined) {
			mgm = new ModuleGraphModule();
			this._moduleMap.set(module, mgm);
		}
		this._cacheModuleGraphModuleKey2 = this._cacheModuleGraphModuleKey1;
		this._cacheModuleGraphModuleValue2 = this._cacheModuleGraphModuleValue1;
		this._cacheModuleGraphModuleKey1 = module;
		this._cacheModuleGraphModuleValue1 = mgm;
		return mgm;
	}

	/**
	 * @param {Dependency} dependency the dependency
	 * @returns {ModuleGraphDependency} the internal dependency
	 */
	_getModuleGraphDependency(dependency) {
		if (this._cacheModuleGraphDependencyKey === dependency)
			return this._cacheModuleGraphDependencyValue;
		let mgd = this._dependencyMap.get(dependency);
		if (mgd === undefined) {
			mgd = new ModuleGraphDependency();
			this._dependencyMap.set(dependency, mgd);
		}
		this._cacheModuleGraphDependencyKey = dependency;
		this._cacheModuleGraphDependencyValue = mgd;
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
	 * @returns {void}
	 */
	setResolvedModule(originModule, dependency, module) {
		const connection = new ModuleGraphConnection(
			originModule,
			dependency,
			module,
			undefined,
			dependency.weak,
			dependency.getCondition(this)
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
	 * @returns {void}
	 */
	removeConnection(dependency) {
		const mgd = this._getModuleGraphDependency(dependency);
		const { connection } = mgd;
		const targetMgm = this._getModuleGraphModule(connection.module);
		targetMgm.incomingConnections.delete(connection);
		const originMgm = this._getModuleGraphModule(connection.originModule);
		originMgm.outgoingConnections.delete(connection);
		mgd.connection = undefined;
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
		newMgm.exports = oldMgm.exports;
		newMgm.async = oldMgm.async;
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
		mgm.async = false;
	}

	/**
	 * @returns {void}
	 */
	removeAllModuleAttributes() {
		for (const mgm of this._moduleMap.values()) {
			mgm.postOrderIndex = null;
			mgm.preOrderIndex = null;
			mgm.depth = null;
			mgm.async = false;
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
	 * @param {Module | null} issuer the issuer module
	 * @returns {void}
	 */
	setIssuerIfUnset(module, issuer) {
		const mgm = this._getModuleGraphModule(module);
		if (mgm.issuer === undefined) mgm.issuer = issuer;
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
	 * @param {string | string[]} exportName a name of an export
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
	 * @param {string} exportName the export
	 * @returns {ExportInfo} info about the export (do not modify)
	 */
	getReadOnlyExportInfo(module, exportName) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.exports.getReadOnlyExportInfo(exportName);
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
		return mgm.exports.getUsedExports();
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
	 * @param {Module} module the module
	 * @returns {boolean} true, if the module is async
	 */
	isAsync(module) {
		const mgm = this._getModuleGraphModule(module);
		return mgm.async;
	}

	/**
	 * @param {Module} module the module
	 * @returns {void}
	 */
	setAsync(module) {
		const mgm = this._getModuleGraphModule(module);
		mgm.async = true;
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
module.exports.ExportsInfo = ExportsInfo;
module.exports.ExportInfo = ExportInfo;
module.exports.UsageState = UsageState;
