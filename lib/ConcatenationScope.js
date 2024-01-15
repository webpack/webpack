/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Module")} Module */

const MODULE_REFERENCE_REGEXP =
	/^__WEBPACK_MODULE_REFERENCE__(\d+)_([\da-f]+|ns)(_call)?(_directImport)?(?:_asiSafe(\d))?__$/;

const DEFAULT_EXPORT = "__WEBPACK_DEFAULT_EXPORT__";
const NAMESPACE_OBJECT_EXPORT = "__WEBPACK_NAMESPACE_OBJECT__";

/**
 * @typedef {Object} ExternalModuleInfo
 * @property {number} index
 * @property {Module} module
 */

/**
 * @typedef {Object} ConcatenatedModuleInfo
 * @property {number} index
 * @property {Module} module
 * @property {Map<string, string>} exportMap mapping from export name to symbol
 * @property {Map<string, string>} rawExportMap mapping from export name to symbol
 * @property {string=} namespaceExportSymbol
 */

/** @typedef {ConcatenatedModuleInfo | ExternalModuleInfo} ModuleInfo */

/**
 * @typedef {Object} ModuleReferenceOptions
 * @property {string[]} ids the properties/exports of the module
 * @property {boolean} call true, when this referenced export is called
 * @property {boolean} directImport true, when this referenced export is directly imported (not via property access)
 * @property {boolean | undefined} asiSafe if the position is ASI safe or unknown
 */

class ConcatenationScope {
	/**
	 * @param {ModuleInfo[] | Map<Module, ModuleInfo>} modulesMap all module info by module
	 * @param {ConcatenatedModuleInfo} currentModule the current module info
	 */
	constructor(modulesMap, currentModule) {
		this._currentModule = currentModule;
		if (Array.isArray(modulesMap)) {
			const map = new Map();
			for (const info of modulesMap) {
				map.set(info.module, info);
			}
			modulesMap = map;
		}
		this._modulesMap = modulesMap;
	}

	/**
	 * @param {Module} module the referenced module
	 * @returns {boolean} true, when it's in the scope
	 */
	isModuleInScope(module) {
		return this._modulesMap.has(module);
	}

	/**
	 *
	 * @param {string} exportName name of the export
	 * @param {string} symbol identifier of the export in source code
	 */
	registerExport(exportName, symbol) {
		if (!this._currentModule.exportMap) {
			this._currentModule.exportMap = new Map();
		}
		if (!this._currentModule.exportMap.has(exportName)) {
			this._currentModule.exportMap.set(exportName, symbol);
		}
	}

	/**
	 *
	 * @param {string} exportName name of the export
	 * @param {string} expression expression to be used
	 */
	registerRawExport(exportName, expression) {
		if (!this._currentModule.rawExportMap) {
			this._currentModule.rawExportMap = new Map();
		}
		if (!this._currentModule.rawExportMap.has(exportName)) {
			this._currentModule.rawExportMap.set(exportName, expression);
		}
	}

	/**
	 * @param {string} symbol identifier of the export in source code
	 */
	registerNamespaceExport(symbol) {
		this._currentModule.namespaceExportSymbol = symbol;
	}

	/**
	 *
	 * @param {Module} module the referenced module
	 * @param {Partial<ModuleReferenceOptions>} options options
	 * @returns {string} the reference as identifier
	 */
	createModuleReference(
		module,
		{ ids = undefined, call = false, directImport = false, asiSafe = false }
	) {
		const info = /** @type {ModuleInfo} */ (this._modulesMap.get(module));
		const callFlag = call ? "_call" : "";
		const directImportFlag = directImport ? "_directImport" : "";
		const asiSafeFlag = asiSafe
			? "_asiSafe1"
			: asiSafe === false
				? "_asiSafe0"
				: "";
		const exportData = ids
			? Buffer.from(JSON.stringify(ids), "utf-8").toString("hex")
			: "ns";
		// a "._" is appended to allow "delete ...", which would cause a SyntaxError in strict mode
		return `__WEBPACK_MODULE_REFERENCE__${info.index}_${exportData}${callFlag}${directImportFlag}${asiSafeFlag}__._`;
	}

	/**
	 * @param {string} name the identifier
	 * @returns {boolean} true, when it's an module reference
	 */
	static isModuleReference(name) {
		return MODULE_REFERENCE_REGEXP.test(name);
	}

	/**
	 * @param {string} name the identifier
	 * @returns {ModuleReferenceOptions & { index: number } | null} parsed options and index
	 */
	static matchModuleReference(name) {
		const match = MODULE_REFERENCE_REGEXP.exec(name);
		if (!match) return null;
		const index = +match[1];
		const asiSafe = match[5];
		return {
			index,
			ids:
				match[2] === "ns"
					? []
					: JSON.parse(Buffer.from(match[2], "hex").toString("utf-8")),
			call: !!match[3],
			directImport: !!match[4],
			asiSafe: asiSafe ? asiSafe === "1" : undefined
		};
	}
}

ConcatenationScope.DEFAULT_EXPORT = DEFAULT_EXPORT;
ConcatenationScope.NAMESPACE_OBJECT_EXPORT = NAMESPACE_OBJECT_EXPORT;

module.exports = ConcatenationScope;
