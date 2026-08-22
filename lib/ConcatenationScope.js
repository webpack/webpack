/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	DEFAULT_EXPORT,
	NAMESPACE_OBJECT_EXPORT
} = require("./util/concatenate");

/** @import { Source } from "webpack-sources" */
/** @import Module from "./Module" */
/**
 * @import {
 * 	ConcatenatedModuleInfo,
 * 	ModuleInfo,
 * 	ExportName as Ids
 * } from "./optimize/ConcatenatedModule"
 */
/** @import { Range } from "./javascript/JavascriptParser" */

/** @typedef {{ start: number, end: number, name: string }} ModuleReferenceMatch */

const MODULE_REFERENCE_REGEXP =
	/^__WEBPACK_MODULE_REFERENCE__(\d+)_([\da-f]+|ns)(_call)?(_directImport)?(_deferredImport)?(_mangleableNs)?(_moduleExportsAccess)?(?:_asiSafe(\d))?__$/;

// unanchored variant: wrapped CJS bodies are not re-parsed, so their
// references must be found textually
const MODULE_REFERENCE_SCAN_REGEXP = new RegExp(
	MODULE_REFERENCE_REGEXP.source.slice(1, -1),
	"g"
);

/** @type {WeakMap<Source, ModuleReferenceMatch[]>} */
const moduleReferencesCache = new WeakMap();

/**
 * Encodes how a concatenated module reference should be interpreted when it is
 * later reconstructed from its placeholder identifier.
 * @typedef {object} ModuleReferenceOptions
 * @property {Ids} ids the properties or exports selected from the referenced module
 * @property {boolean} call true, when this referenced export is called
 * @property {boolean} directImport true, when this referenced export is directly imported (not via property access)
 * @property {boolean} deferredImport true, when this referenced export is deferred
 * @property {boolean} mangleableNamespace true, when a whole-namespace reference may use a decoupled namespace object that keeps the original export names
 * @property {boolean} moduleExportsAccess true, when the reference resolves to the module's own exports value with plain property access, skipping ESM interop (how `require()` and a wrapped module's side-effect init see it)
 * @property {boolean | undefined} asiSafe if the position is ASI safe or unknown
 */

/**
 * Tracks the symbols and cross-module references needed while rendering a
 * concatenated module.
 */
class ConcatenationScope {
	/**
	 * Creates the mutable scope object used while rendering a concatenated
	 * module and its cross-module references.
	 * @param {ModuleInfo[] | Map<Module, ModuleInfo>} modulesMap all module info by module
	 * @param {ConcatenatedModuleInfo} currentModule the current module info
	 * @param {Set<string>} usedNames all used names
	 */
	constructor(modulesMap, currentModule, usedNames) {
		/** @type {ConcatenatedModuleInfo} */
		this._currentModule = currentModule;
		if (Array.isArray(modulesMap)) {
			/** @type {Map<Module, ConcatenatedModuleInfo>} */
			const map = new Map();
			for (const info of modulesMap) {
				map.set(info.module, /** @type {ConcatenatedModuleInfo} */ (info));
			}
			modulesMap = map;
		}
		/** @type {Set<string>} */
		this.usedNames = usedNames;
		/** @type {Map<Module, ModuleInfo>} */
		this._modulesMap = modulesMap;
		// written and read by dependency templates within a single code
		// generation pass, never across passes
		/** @type {Range[] | undefined} */
		this._replacedRequireRanges = undefined;
	}

	/**
	 * Checks whether a module participates in the current concatenation scope.
	 * @param {Module} module the referenced module
	 * @returns {boolean} true, when it's in the scope
	 */
	isModuleInScope(module) {
		return this._modulesMap.has(module);
	}

	/**
	 * Whether an in-scope module's body renders inside the lazy wrapper.
	 * @param {Module} module the referenced module
	 * @returns {boolean} true, when it's wrapped
	 */
	isModuleWrapped(module) {
		const info = this._modulesMap.get(module);
		return info !== undefined && info.wrapped;
	}

	/**
	 * Marks a wrapped module as eagerly imported, so its accessor is called at its
	 * own slot in evaluation order instead of from inside the importing body.
	 * @param {Module} module the referenced module
	 */
	registerEagerModule(module) {
		const info = this._modulesMap.get(module);
		if (info !== undefined) info.eager = true;
	}

	/**
	 * Whether the current module runs inside the lazy wrapper. Exports then live
	 * on a real exports object, not hoisted bindings, so templates emit runtime
	 * code.
	 * @returns {boolean} true, when the current module is wrapped
	 */
	isWrapped() {
		return this._currentModule.wrapped;
	}

	/**
	 * Records a `require(...)` call that was replaced as a whole by a
	 * concatenation reference, so nothing else rewrites a range inside it.
	 * @param {Range} range source range of the replaced call
	 */
	registerReplacedRequire(range) {
		if (this._replacedRequireRanges === undefined) {
			this._replacedRequireRanges = [];
		}
		this._replacedRequireRanges.push(range);
	}

	/**
	 * Checks whether an offset sits inside an already-replaced `require(...)` call.
	 * Containment, not exact match: `new require(...)` is replaced from `new`.
	 * @param {number} start start offset to test
	 * @returns {boolean} true, when the offset was replaced already
	 */
	isInsideReplacedRequire(start) {
		const ranges = this._replacedRequireRanges;
		if (ranges === undefined) return false;
		for (const [rangeStart, rangeEnd] of ranges) {
			if (start >= rangeStart && start < rangeEnd) return true;
		}
		return false;
	}

	/**
	 * Records the symbol that should be used when the current module exports a
	 * named binding.
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
	 * Records a raw expression that can be used to reference an export without
	 * going through the normal symbol map.
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
	 * Returns the raw expression registered for an export, if one exists.
	 * @param {string} exportName name of the export
	 * @returns {string | undefined} the expression of the export
	 */
	getRawExport(exportName) {
		if (!this._currentModule.rawExportMap) {
			return undefined;
		}
		return this._currentModule.rawExportMap.get(exportName);
	}

	/**
	 * Replaces the raw expression for an export only when that export already
	 * has an entry in the raw export map.
	 * @param {string} exportName name of the export
	 * @param {string} expression expression to be used
	 */
	setRawExportMap(exportName, expression) {
		if (!this._currentModule.rawExportMap) {
			this._currentModule.rawExportMap = new Map();
		}
		if (this._currentModule.rawExportMap.has(exportName)) {
			this._currentModule.rawExportMap.set(exportName, expression);
		}
	}

	/**
	 * Records the symbol that should be used for the synthetic namespace export.
	 * @param {string} symbol identifier of the export in source code
	 */
	registerNamespaceExport(symbol) {
		this._currentModule.namespaceExportSymbol = symbol;
	}

	/**
	 * Encodes a reference to another concatenated module as a placeholder
	 * identifier that can be parsed later during code generation.
	 * @param {Module} module the referenced module
	 * @param {Partial<ModuleReferenceOptions>} options options
	 * @returns {string} the reference as identifier
	 */
	createModuleReference(
		module,
		{
			ids = undefined,
			call = false,
			directImport = false,
			deferredImport = false,
			mangleableNamespace = false,
			moduleExportsAccess = false,
			asiSafe = false
		}
	) {
		const info = /** @type {ModuleInfo} */ (this._modulesMap.get(module));
		const callFlag = call ? "_call" : "";
		const directImportFlag = directImport ? "_directImport" : "";
		const deferredImportFlag = deferredImport ? "_deferredImport" : "";
		const mangleableNamespaceFlag = mangleableNamespace ? "_mangleableNs" : "";
		const moduleExportsAccessFlag = moduleExportsAccess
			? "_moduleExportsAccess"
			: "";
		const asiSafeFlag = asiSafe
			? "_asiSafe1"
			: asiSafe === false
				? "_asiSafe0"
				: "";
		const exportData = ids
			? Buffer.from(JSON.stringify(ids), "utf8").toString("hex")
			: "ns";
		// a "._" is appended to allow "delete ...", which would cause a SyntaxError in strict mode
		return `__WEBPACK_MODULE_REFERENCE__${info.index}_${exportData}${callFlag}${directImportFlag}${deferredImportFlag}${mangleableNamespaceFlag}${moduleExportsAccessFlag}${asiSafeFlag}__._`;
	}

	/**
	 * Checks whether an identifier is one of webpack's encoded concatenation
	 * module references.
	 * @param {string} name the identifier
	 * @returns {boolean} true, when it's an module reference
	 */
	static isModuleReference(name) {
		return MODULE_REFERENCE_REGEXP.test(name);
	}

	/**
	 * Finds all encoded module references in a generated source.
	 * @param {Source} source generated source
	 * @returns {ModuleReferenceMatch[]} reference token positions (end is exclusive, excludes the appended "._")
	 */
	static findModuleReferences(source) {
		const cached = moduleReferencesCache.get(source);
		if (cached !== undefined) return cached;
		const code = source.source().toString();
		/** @type {ModuleReferenceMatch[]} */
		const result = [];
		MODULE_REFERENCE_SCAN_REGEXP.lastIndex = 0;
		let match = MODULE_REFERENCE_SCAN_REGEXP.exec(code);
		while (match !== null) {
			result.push({
				start: match.index,
				end: match.index + match[0].length,
				name: match[0]
			});
			match = MODULE_REFERENCE_SCAN_REGEXP.exec(code);
		}
		moduleReferencesCache.set(source, result);
		return result;
	}

	/**
	 * Parses an encoded module reference back into its module index and
	 * reference flags.
	 * @param {string} name the identifier
	 * @returns {ModuleReferenceOptions & { index: number } | null} parsed options and index
	 */
	static matchModuleReference(name) {
		const match = MODULE_REFERENCE_REGEXP.exec(name);
		if (!match) return null;
		const index = Number(match[1]);
		const asiSafe = match[8];
		return {
			index,
			ids:
				match[2] === "ns"
					? []
					: JSON.parse(Buffer.from(match[2], "hex").toString("utf8")),
			call: Boolean(match[3]),
			directImport: Boolean(match[4]),
			deferredImport: Boolean(match[5]),
			mangleableNamespace: Boolean(match[6]),
			moduleExportsAccess: Boolean(match[7]),
			asiSafe: asiSafe ? asiSafe === "1" : undefined
		};
	}
}

ConcatenationScope.DEFAULT_EXPORT = DEFAULT_EXPORT;
ConcatenationScope.NAMESPACE_OBJECT_EXPORT = NAMESPACE_OBJECT_EXPORT;

module.exports = ConcatenationScope;
