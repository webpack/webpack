/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SortableSet = require("./util/SortableSet");
const makeSerializable = require("./util/makeSerializable");
const { forEachRuntime } = require("./util/runtime");

/** @typedef {import("./Dependency").RuntimeSpec} RuntimeSpec */
/** @typedef {import("./util/Hash")} Hash */

/** @typedef {typeof UsageState.OnlyPropertiesUsed | typeof UsageState.NoInfo | typeof UsageState.Unknown | typeof UsageState.Used} RuntimeUsageStateType */
/** @typedef {typeof UsageState.Unused | RuntimeUsageStateType} UsageStateType */

const UsageState = Object.freeze({
	Unused: /** @type {0} */ (0),
	OnlyPropertiesUsed: /** @type {1} */ (1),
	NoInfo: /** @type {2} */ (2),
	Unknown: /** @type {3} */ (3),
	Used: /** @type {4} */ (4)
});

class RestoreProvidedData {
	constructor(exports, otherProvided, otherCanMangleProvide) {
		this.exports = exports;
		this.otherProvided = otherProvided;
		this.otherCanMangleProvide = otherCanMangleProvide;
	}

	serialize({ write }) {
		write(this.exports);
		write(this.otherProvided), write(this.otherCanMangleProvide);
	}

	static deserialize({ read }) {
		return new RestoreProvidedData(read(), read(), read());
	}
}

makeSerializable(
	RestoreProvidedData,
	"webpack/lib/ModuleGraph",
	"RestoreProvidedData"
);

class ExportsInfo {
	constructor() {
		/** @type {Map<string, ExportInfo>} */
		this._exports = new Map();
		this._otherExportsInfo = new ExportInfo(null);
		this._sideEffectsOnlyInfo = new ExportInfo("*side effects only*");
		this._exportsAreOrdered = false;
		/** @type {ExportsInfo=} */
		this._redirectTo = undefined;
	}

	/**
	 * @returns {Iterable<ExportInfo>} all owned exports in any order
	 */
	get ownedExports() {
		return this._exports.values();
	}

	/**
	 * @returns {Iterable<ExportInfo>} all owned exports in order
	 */
	get orderedOwnedExports() {
		if (!this._exportsAreOrdered) {
			this._sortExports();
		}
		return this._exports.values();
	}

	/**
	 * @returns {Iterable<ExportInfo>} all exports in any order
	 */
	get exports() {
		if (this._redirectTo !== undefined) {
			const map = new Map(this._redirectTo._exports);
			for (const [key, value] of this._exports) {
				map.set(key, value);
			}
			return map.values();
		}
		return this._exports.values();
	}

	/**
	 * @returns {Iterable<ExportInfo>} all exports in order
	 */
	get orderedExports() {
		if (!this._exportsAreOrdered) {
			this._sortExports();
		}
		if (this._redirectTo !== undefined) {
			const map = new Map(
				Array.from(this._redirectTo.orderedExports, item => [item.name, item])
			);
			for (const [key, value] of this._exports) {
				map.set(key, value);
			}
			// sorting should be pretty fast as map contains
			// a lot of presorted items
			this._sortExportsMap(map);
			return map.values();
		}
		return this._exports.values();
	}

	/**
	 * @returns {ExportInfo} the export info of unlisted exports
	 */
	get otherExportsInfo() {
		if (this._redirectTo !== undefined)
			return this._redirectTo.otherExportsInfo;
		return this._otherExportsInfo;
	}

	_sortExportsMap(exports) {
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
	}

	_sortExports() {
		this._sortExportsMap(this._exports);
		this._exportsAreOrdered = true;
	}

	setRedirectNamedTo(exportsInfo) {
		if (this._redirectTo === exportsInfo) return false;
		this._redirectTo = exportsInfo;
		return true;
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
		if (this._redirectTo !== undefined) {
			this._redirectTo.setHasProvideInfo();
		} else {
			if (this._otherExportsInfo.provided === undefined) {
				this._otherExportsInfo.provided = false;
			}
			if (this._otherExportsInfo.canMangleProvide === undefined) {
				this._otherExportsInfo.canMangleProvide = true;
			}
		}
	}

	setHasUseInfo() {
		for (const exportInfo of this._exports.values()) {
			exportInfo.setHasUseInfo();
		}
		this._sideEffectsOnlyInfo.setHasUseInfo();
		if (this._redirectTo !== undefined) {
			this._redirectTo.setHasUseInfo();
		} else {
			this._otherExportsInfo.setHasUseInfo();
			if (this._otherExportsInfo.canMangleUse === undefined) {
				this._otherExportsInfo.canMangleUse = true;
			}
		}
	}

	/**
	 * @param {string} name export name
	 * @returns {ExportInfo} export info for this name
	 */
	getOwnExportInfo(name) {
		const info = this._exports.get(name);
		if (info !== undefined) return info;
		const newInfo = new ExportInfo(name, this._otherExportsInfo);
		this._exports.set(name, newInfo);
		this._exportsAreOrdered = false;
		return newInfo;
	}

	/**
	 * @param {string} name export name
	 * @returns {ExportInfo} export info for this name
	 */
	getExportInfo(name) {
		const info = this._exports.get(name);
		if (info !== undefined) return info;
		if (this._redirectTo !== undefined)
			return this._redirectTo.getExportInfo(name);
		const newInfo = new ExportInfo(name, this._otherExportsInfo);
		this._exports.set(name, newInfo);
		this._exportsAreOrdered = false;
		return newInfo;
	}

	/**
	 * @param {string} name export name
	 * @returns {ExportInfo} export info for this name
	 */
	getReadOnlyExportInfo(name) {
		const info = this._exports.get(name);
		if (info !== undefined) return info;
		if (this._redirectTo !== undefined)
			return this._redirectTo.getReadOnlyExportInfo(name);
		return this._otherExportsInfo;
	}

	/**
	 * @param {string[]=} name the export name
	 * @returns {ExportsInfo | undefined} the nested exports info
	 */
	getNestedExportsInfo(name) {
		if (Array.isArray(name) && name.length > 0) {
			const info = this.getReadOnlyExportInfo(name[0]);
			if (!info.exportsInfo) return undefined;
			return info.exportsInfo.getNestedExportsInfo(name.slice(1));
		}
		return this;
	}

	/**
	 * @param {boolean=} canMangle true, if exports can still be mangled (defaults to false)
	 * @param {Set<string>=} excludeExports list of unaffected exports
	 * @returns {boolean} true, if this call changed something
	 */
	setUnknownExportsProvided(canMangle, excludeExports) {
		let changed = false;
		if (excludeExports) {
			for (const name of excludeExports) {
				// Make sure these entries exist, so they can get different info
				this.getExportInfo(name);
			}
		}
		for (const exportInfo of this._exports.values()) {
			if (excludeExports && excludeExports.has(exportInfo.name)) continue;
			if (exportInfo.provided !== true && exportInfo.provided !== null) {
				exportInfo.provided = null;
				changed = true;
			}
			if (!canMangle && exportInfo.canMangleProvide !== false) {
				exportInfo.canMangleProvide = false;
				changed = true;
			}
		}
		if (this._redirectTo !== undefined) {
			if (
				this._redirectTo.setUnknownExportsProvided(canMangle, excludeExports)
			) {
				changed = true;
			}
		} else {
			if (
				this._otherExportsInfo.provided !== true &&
				this._otherExportsInfo.provided !== null
			) {
				this._otherExportsInfo.provided = null;
				changed = true;
			}
			if (!canMangle && this._otherExportsInfo.canMangleProvide !== false) {
				this._otherExportsInfo.canMangleProvide = false;
				changed = true;
			}
		}
		return changed;
	}

	/**
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {boolean} true, when something changed
	 */
	setUsedInUnknownWay(runtime) {
		let changed = false;
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.setUsedInUnknownWay(runtime)) {
				changed = true;
			}
		}
		if (this._redirectTo !== undefined) {
			if (this._redirectTo.setUsedInUnknownWay(runtime)) {
				changed = true;
			}
		} else {
			if (
				this._otherExportsInfo.setUsedConditionally(
					used => used < UsageState.Unknown,
					UsageState.Unknown,
					runtime
				)
			) {
				changed = true;
			}
			if (this._otherExportsInfo.canMangleUse !== false) {
				this._otherExportsInfo.canMangleUse = false;
				changed = true;
			}
		}
		return changed;
	}

	/**
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {boolean} true, when something changed
	 */
	setUsedWithoutInfo(runtime) {
		let changed = false;
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.setUsedWithoutInfo(runtime)) {
				changed = true;
			}
		}
		if (this._redirectTo !== undefined) {
			if (this._redirectTo.setUsedWithoutInfo(runtime)) {
				changed = true;
			}
		} else {
			if (this._otherExportsInfo.setUsed(UsageState.NoInfo, runtime)) {
				changed = true;
			}
			if (this._otherExportsInfo.canMangleUse !== false) {
				this._otherExportsInfo.canMangleUse = false;
				changed = true;
			}
		}
		return changed;
	}

	/**
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {boolean} true, when something changed
	 */
	setAllKnownExportsUsed(runtime) {
		let changed = false;
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.setUsed(UsageState.Used, runtime)) {
				changed = true;
			}
		}
		return changed;
	}

	/**
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {boolean} true, when something changed
	 */
	setUsedForSideEffectsOnly(runtime) {
		return this._sideEffectsOnlyInfo.setUsedConditionally(
			used => used === UsageState.Unused,
			UsageState.Used,
			runtime
		);
	}

	/**
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {boolean} true, when the module is used in any way
	 */
	isUsed(runtime) {
		if (this._redirectTo !== undefined) {
			if (this._redirectTo.isUsed(runtime)) {
				return true;
			}
		} else {
			if (this._otherExportsInfo.getUsed(runtime) !== UsageState.Unused) {
				return true;
			}
		}
		if (this._sideEffectsOnlyInfo.getUsed(runtime) !== UsageState.Unused) {
			return true;
		}
		for (const exportInfo of this._exports.values()) {
			if (exportInfo.getUsed(runtime) !== UsageState.Unused) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {SortableSet<string> | boolean | null} set of used exports, or true (when namespace object is used), or false (when unused), or null (when unknown)
	 */
	getUsedExports(runtime) {
		if (!this._redirectTo !== undefined) {
			switch (this._otherExportsInfo.getUsed(runtime)) {
				case UsageState.NoInfo:
					return null;
				case UsageState.Unknown:
					return true;
				case UsageState.OnlyPropertiesUsed:
				case UsageState.Used:
					return true;
			}
		}
		const array = [];
		if (!this._exportsAreOrdered) this._sortExports();
		for (const exportInfo of this._exports.values()) {
			switch (exportInfo.getUsed(runtime)) {
				case UsageState.NoInfo:
					return null;
				case UsageState.Unknown:
					return true;
				case UsageState.OnlyPropertiesUsed:
				case UsageState.Used:
					array.push(exportInfo.name);
			}
		}
		if (this._redirectTo !== undefined) {
			const inner = this._redirectTo.getUsedExports(runtime);
			if (inner === null) return null;
			if (inner === true) return true;
			if (inner !== false) {
				for (const item of inner) {
					array.push(item);
				}
			}
		}
		if (array.length === 0) {
			switch (this._sideEffectsOnlyInfo.getUsed(runtime)) {
				case UsageState.NoInfo:
					return null;
				case UsageState.Unused:
					return false;
			}
		}
		return new SortableSet(array);
	}

	/**
	 * @returns {null | true | string[]} list of exports when known
	 */
	getProvidedExports() {
		if (!this._redirectTo !== undefined) {
			switch (this._otherExportsInfo.provided) {
				case undefined:
					return null;
				case null:
					return true;
				case true:
					return true;
			}
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
		if (this._redirectTo !== undefined) {
			const inner = this._redirectTo.getProvidedExports();
			if (inner === null) return null;
			if (inner === true) return true;
			for (const item of inner) {
				if (!array.includes(item)) {
					array.push(item);
				}
			}
		}
		return array;
	}

	/**
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {boolean} true, when the module has enough information to create a list of exports
	 */
	hasStaticExportsList(runtime) {
		if (
			this._redirectTo !== undefined &&
			!this._redirectTo.hasStaticExportsList(runtime)
		)
			return false;
		if (
			this._otherExportsInfo.provided !== false &&
			this._otherExportsInfo.getUsed(runtime) !== UsageState.Unused
		) {
			return false;
		}
		for (const exportInfo of this._exports.values()) {
			if (
				typeof exportInfo.provided !== "boolean" &&
				exportInfo.getUsed(runtime) !== UsageState.Unused
			) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @param {string | string[]} name the name of the export
	 * @returns {boolean | undefined | null} if the export is provided
	 */
	isExportProvided(name) {
		if (Array.isArray(name)) {
			const info = this.getReadOnlyExportInfo(name[0]);
			if (info.exportsInfo && name.length > 1) {
				return info.exportsInfo.isExportProvided(name.slice(1));
			}
			return info.provided;
		}
		const info = this.getReadOnlyExportInfo(name);
		return info.provided;
	}

	/**
	 * @param {RuntimeSpec} runtime runtime
	 * @returns {string} key representing the usage
	 */
	getUsageKey(runtime) {
		const key = [];
		if (this._redirectTo !== undefined) {
			key.push(this._redirectTo.getUsageKey(runtime));
		} else {
			key.push(this._otherExportsInfo.getUsed(runtime));
		}
		key.push(this._sideEffectsOnlyInfo.getUsed(runtime));
		for (const exportInfo of this.orderedOwnedExports) {
			key.push(exportInfo.getUsed(runtime));
		}
		return key.join("|");
	}

	/**
	 * @param {RuntimeSpec} runtimeA first runtime
	 * @param {RuntimeSpec} runtimeB second runtime
	 * @returns {boolean} true, when equally used
	 */
	isEquallyUsed(runtimeA, runtimeB) {
		if (this._redirectTo !== undefined) {
			if (!this._redirectTo.isEquallyUsed(runtimeA, runtimeB)) return false;
		} else {
			if (
				this._otherExportsInfo.getUsed(runtimeA) !==
				this._otherExportsInfo.getUsed(runtimeB)
			) {
				return false;
			}
		}
		if (
			this._sideEffectsOnlyInfo.getUsed(runtimeA) !==
			this._sideEffectsOnlyInfo.getUsed(runtimeB)
		) {
			return false;
		}
		for (const exportInfo of this.ownedExports) {
			if (exportInfo.getUsed(runtimeA) !== exportInfo.getUsed(runtimeB))
				return false;
		}
		return true;
	}

	/**
	 * @param {string | string[]} name export name
	 * @param {RuntimeSpec} runtime check usage for this runtime only
	 * @returns {UsageStateType} usage status
	 */
	getUsed(name, runtime) {
		if (Array.isArray(name)) {
			if (name.length === 0) return this.otherExportsInfo.getUsed(runtime);
			let info = this.getReadOnlyExportInfo(name[0]);
			if (info.exportsInfo && name.length > 1) {
				return info.exportsInfo.getUsed(name.slice(1), runtime);
			}
			return info.getUsed(runtime);
		}
		let info = this.getReadOnlyExportInfo(name);
		return info.getUsed(runtime);
	}

	/**
	 * @param {string | string[]} name the export name
	 * @param {RuntimeSpec} runtime check usage for this runtime only
	 * @returns {string | string[] | false} the used name
	 */
	getUsedName(name, runtime) {
		if (Array.isArray(name)) {
			// TODO improve this
			if (name.length === 0) return name;
			let info = this.getReadOnlyExportInfo(name[0]);
			const x = info.getUsedName(name[0], runtime);
			if (x === false) return false;
			const arr = x === name[0] && name.length === 1 ? name : [x];
			if (name.length === 1) {
				return arr;
			}
			if (
				info.exportsInfo &&
				info.getUsed(runtime) === UsageState.OnlyPropertiesUsed
			) {
				const nested = info.exportsInfo.getUsedName(name.slice(1), runtime);
				if (!nested) return false;
				return arr.concat(nested);
			} else {
				return arr.concat(name.slice(1));
			}
		} else {
			let info = this.getReadOnlyExportInfo(name);
			const usedName = info.getUsedName(name, runtime);
			return usedName;
		}
	}

	/**
	 * @param {Hash} hash the hash
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {void}
	 */
	updateHash(hash, runtime) {
		for (const exportInfo of this.orderedExports) {
			exportInfo.updateHash(hash, runtime);
		}
		this._sideEffectsOnlyInfo.updateHash(hash, runtime);
		this._otherExportsInfo.updateHash(hash, runtime);
		if (this._redirectTo !== undefined) {
			this._redirectTo.updateHash(hash, runtime);
		}
	}

	getRestoreProvidedData() {
		const otherProvided = this._otherExportsInfo.provided;
		const otherCanMangleProvide = this._otherExportsInfo.canMangleProvide;
		const exports = [];
		for (const exportInfo of this._exports.values()) {
			if (
				exportInfo.provided !== otherProvided ||
				exportInfo.canMangleProvide !== otherCanMangleProvide ||
				exportInfo.exportsInfoOwned
			) {
				exports.push({
					name: exportInfo.name,
					provided: exportInfo.provided,
					canMangleProvide: exportInfo.canMangleProvide,
					exportsInfo: exportInfo.exportsInfoOwned
						? exportInfo.exportsInfo.getRestoreProvidedData()
						: undefined
				});
			}
		}
		return new RestoreProvidedData(
			exports,
			otherProvided,
			otherCanMangleProvide
		);
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
			if (exp.exportsInfo) {
				const exportsInfo = exportInfo.createNestedExportsInfo();
				exportsInfo.restoreProvided(exp.exportsInfo);
			}
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
		/** @private @type {string | null} */
		this._usedName = initFrom ? initFrom._usedName : null;
		/** @private @type {Map<string, RuntimeUsageStateType>} */
		this._usedInRuntime =
			initFrom && initFrom._usedInRuntime
				? new Map(initFrom._usedInRuntime)
				: undefined;
		/** @private @type {boolean} */
		this._hasUseInRuntimeInfo = initFrom
			? initFrom._hasUseInRuntimeInfo
			: false;
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
		/** @type {boolean} */
		this.exportsInfoOwned = false;
		/** @type {ExportsInfo=} */
		this.exportsInfo = undefined;
	}

	// TODO webpack 5 remove
	/** @private */
	get used() {
		throw new Error("REMOVED");
	}
	/** @private */
	get usedName() {
		throw new Error("REMOVED");
	}
	/**
	 * @private
	 * @param {*} v v
	 */
	set used(v) {
		throw new Error("REMOVED");
	}
	/**
	 * @private
	 * @param {*} v v
	 */
	set usedName(v) {
		throw new Error("REMOVED");
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

	/**
	 * @param {RuntimeSpec} runtime only apply to this runtime
	 * @returns {boolean} true, when something changed
	 */
	setUsedInUnknownWay(runtime) {
		let changed = false;
		if (
			this.setUsedConditionally(
				used => used < UsageState.Unknown,
				UsageState.Unknown,
				runtime
			)
		) {
			changed = true;
		}
		if (this.canMangleUse !== false) {
			this.canMangleUse = false;
			changed = true;
		}
		return changed;
	}

	/**
	 * @param {RuntimeSpec} runtime only apply to this runtime
	 * @returns {boolean} true, when something changed
	 */
	setUsedWithoutInfo(runtime) {
		let changed = false;
		if (this.setUsed(UsageState.NoInfo, runtime)) {
			changed = true;
		}
		if (this.canMangleUse !== false) {
			this.canMangleUse = false;
			changed = true;
		}
		return changed;
	}

	setHasUseInfo() {
		if (!this._hasUseInRuntimeInfo) {
			this._hasUseInRuntimeInfo = true;
		}
		if (this.canMangleUse === undefined) {
			this.canMangleUse = true;
		}
		if (this.exportsInfoOwned) {
			this.exportsInfo.setHasUseInfo();
		}
	}

	/**
	 * @param {function(UsageStateType): boolean} condition compare with old value
	 * @param {UsageStateType} newValue set when condition is true
	 * @param {RuntimeSpec} runtime only apply to this runtime
	 * @returns {boolean} true when something has changed
	 */
	setUsedConditionally(condition, newValue, runtime) {
		if (this._usedInRuntime === undefined) {
			if (newValue !== UsageState.Unused && condition(UsageState.Unused)) {
				this._usedInRuntime = new Map();
				forEachRuntime(runtime, runtime =>
					this._usedInRuntime.set(runtime, newValue)
				);
				return true;
			}
		} else {
			let changed = false;
			forEachRuntime(runtime, runtime => {
				/** @type {UsageStateType} */
				let oldValue = this._usedInRuntime.get(runtime);
				if (oldValue === undefined) oldValue = UsageState.Unused;
				if (newValue !== oldValue && condition(oldValue)) {
					if (newValue === UsageState.Unused) {
						this._usedInRuntime.delete(runtime);
					} else {
						this._usedInRuntime.set(runtime, newValue);
					}
					changed = true;
				}
			});
			if (changed) {
				if (this._usedInRuntime.size === 0) this._usedInRuntime = undefined;
				return true;
			}
		}
		return false;
	}

	/**
	 * @param {UsageStateType} newValue new value of the used state
	 * @param {RuntimeSpec} runtime only apply to this runtime
	 * @returns {boolean} true when something has changed
	 */
	setUsed(newValue, runtime) {
		if (this._usedInRuntime === undefined) {
			if (newValue !== UsageState.Unused) {
				this._usedInRuntime = new Map();
				forEachRuntime(runtime, runtime =>
					this._usedInRuntime.set(runtime, newValue)
				);
				return true;
			}
		} else {
			let changed = false;
			forEachRuntime(runtime, runtime => {
				/** @type {UsageStateType} */
				let oldValue = this._usedInRuntime.get(runtime);
				if (oldValue === undefined) oldValue = UsageState.Unused;
				if (newValue !== oldValue) {
					if (newValue === UsageState.Unused) {
						this._usedInRuntime.delete(runtime);
					} else {
						this._usedInRuntime.set(runtime, newValue);
					}
					changed = true;
				}
			});
			if (changed) {
				if (this._usedInRuntime.size === 0) this._usedInRuntime = undefined;
				return true;
			}
		}
		return false;
	}

	/**
	 * @param {RuntimeSpec} runtime for this runtime
	 * @returns {UsageStateType} usage state
	 */
	getUsed(runtime) {
		if (!this._hasUseInRuntimeInfo) return UsageState.NoInfo;
		if (this._usedInRuntime === undefined) {
			return UsageState.Unused;
		} else if (typeof runtime === "string") {
			const value = this._usedInRuntime.get(runtime);
			return value === undefined ? UsageState.Unused : value;
		} else if (runtime === undefined) {
			/** @type {UsageStateType} */
			let max = UsageState.Unused;
			for (const value of this._usedInRuntime.values()) {
				if (value === UsageState.Used) {
					return UsageState.Used;
				}
				if (max < value) max = value;
			}
			return max;
		} else {
			/** @type {UsageStateType} */
			let max = UsageState.Unused;
			for (const item of runtime) {
				const value = this._usedInRuntime.get(item);
				if (value !== undefined) {
					if (value === UsageState.Used) {
						return UsageState.Used;
					}
					if (max < value) max = value;
				}
			}
			return max;
		}
	}

	/**
	 * get used name
	 * @param {string=} fallbackName fallback name for used exports with no name
	 * @param {RuntimeSpec} runtime check usage for this runtime only
	 * @returns {string | false} used name
	 */
	getUsedName(fallbackName, runtime) {
		if (this._hasUseInRuntimeInfo) {
			if (this._usedInRuntime === undefined) return false;
			if (typeof runtime === "string") {
				if (!this._usedInRuntime.has(runtime)) {
					return false;
				}
			} else if (runtime !== undefined) {
				if (
					Array.from(runtime).every(
						runtime => !this._usedInRuntime.has(runtime)
					)
				) {
					return false;
				}
			}
		}
		if (this._usedName !== null) return this._usedName;
		return this.name || fallbackName;
	}

	/**
	 * @returns {boolean} true, when a mangled name of this export is set
	 */
	hasUsedName() {
		return this._usedName !== null;
	}

	/**
	 * Sets the mangled name of this export
	 * @param {string} name the new name
	 * @returns {void}
	 */
	setUsedName(name) {
		this._usedName = name;
	}

	createNestedExportsInfo() {
		if (this.exportsInfoOwned) return this.exportsInfo;
		this.exportsInfoOwned = true;
		this.exportsInfo = new ExportsInfo();
		this.exportsInfo.setHasProvideInfo();
		return this.exportsInfo;
	}

	getNestedExportsInfo() {
		return this.exportsInfo;
	}

	updateHash(hash, runtime) {
		hash.update(`${this._usedName || this.name}`);
		hash.update(`${this.getUsed(runtime)}`);
		hash.update(`${this.provided}`);
		hash.update(`${this.canMangle}`);
	}

	getUsedInfo() {
		if (this._usedInRuntime !== undefined) {
			/** @type {Map<RuntimeUsageStateType, string[]>} */
			const map = new Map();
			for (const [runtime, used] of this._usedInRuntime) {
				const list = map.get(used);
				if (list !== undefined) list.push(runtime);
				else map.set(used, [runtime]);
			}
			const specificInfo = Array.from(map, ([used, runtimes]) => {
				switch (used) {
					case UsageState.NoInfo:
						return `no usage info in ${runtimes.join(", ")}`;
					case UsageState.Unknown:
						return `maybe used in ${runtimes.join(", ")} (runtime-defined)`;
					case UsageState.Used:
						return `used in ${runtimes.join(", ")}`;
					case UsageState.OnlyPropertiesUsed:
						return `only properties used in ${runtimes.join(", ")}`;
				}
			});
			if (specificInfo.length > 0) {
				return specificInfo.join("; ");
			}
		}
		return this._hasUseInRuntimeInfo ? "unused" : "no usage info";
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
		if (this._usedName !== null && this._usedName !== this.name) {
			return `renamed to ${JSON.stringify(this._usedName).slice(1, -1)}`;
		}
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
						return "could be renamed";
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

module.exports = ExportsInfo;
module.exports.ExportInfo = ExportInfo;
module.exports.UsageState = UsageState;
