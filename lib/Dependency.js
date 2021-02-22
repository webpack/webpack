/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("./ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/Hash")} Hash */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @typedef {Object} UpdateHashContext
 * @property {ChunkGraph} chunkGraph
 * @property {RuntimeSpec} runtime
 * @property {RuntimeTemplate=} runtimeTemplate
 */

/**
 * @typedef {Object} SourcePosition
 * @property {number} line
 * @property {number=} column
 */

/**
 * @typedef {Object} RealDependencyLocation
 * @property {SourcePosition} start
 * @property {SourcePosition=} end
 * @property {number=} index
 */

/**
 * @typedef {Object} SyntheticDependencyLocation
 * @property {string} name
 * @property {number=} index
 */

/** @typedef {SyntheticDependencyLocation|RealDependencyLocation} DependencyLocation */

/**
 * @typedef {Object} ExportSpec
 * @property {string} name the name of the export
 * @property {boolean=} canMangle can the export be renamed (defaults to true)
 * @property {boolean=} terminalBinding is the export a terminal binding that should be checked for export star conflicts
 * @property {(string | ExportSpec)[]=} exports nested exports
 * @property {ModuleGraphConnection=} from when reexported: from which module
 * @property {string[] | null=} export when reexported: from which export
 * @property {boolean=} hidden export is not visible, because another export blends over it
 */

/**
 * @typedef {Object} ExportsSpec
 * @property {(string | ExportSpec)[] | true | null} exports exported names, true for unknown exports or null for no exports
 * @property {Set<string>=} excludeExports when exports = true, list of unaffected exports
 * @property {Set<string>=} hideExports list of maybe prior exposed, but now hidden exports
 * @property {ModuleGraphConnection=} from when reexported: from which module
 * @property {boolean=} canMangle can the export be renamed (defaults to true)
 * @property {boolean=} terminalBinding are the exports terminal bindings that should be checked for export star conflicts
 * @property {Module[]=} dependencies module on which the result depends on
 */

/**
 * @typedef {Object} ReferencedExport
 * @property {string[]} name name of the referenced export
 * @property {boolean=} canMangle when false, referenced export can not be mangled, defaults to true
 */

class Dependency {
	constructor() {
		// TODO check if this can be moved into ModuleDependency
		/** @type {boolean} */
		this.weak = false;
		// TODO check if this can be moved into ModuleDependency
		/** @type {boolean} */
		this.optional = false;
		/** @type {DependencyLocation} */
		this.loc = undefined;
	}

	/**
	 * @returns {string} a display name for the type of dependency
	 */
	get type() {
		return "unknown";
	}

	/**
	 * @returns {string} a dependency category, typical categories are "commonjs", "amd", "esm"
	 */
	get category() {
		return "unknown";
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return null;
	}

	/**
	 * Returns the referenced module and export
	 * @deprecated
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {never} throws error
	 */
	getReference(moduleGraph) {
		throw new Error(
			"Dependency.getReference was removed in favor of Dependency.getReferencedExports, ModuleGraph.getModule and ModuleGraph.getConnection().active"
		);
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {(string[] | ReferencedExport)[]} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return Dependency.EXPORTS_OBJECT_REFERENCED;
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | function(ModuleGraphConnection, RuntimeSpec): ConnectionState} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return null;
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		return undefined;
	}

	/**
	 * Returns warnings
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[]} warnings
	 */
	getWarnings(moduleGraph) {
		return null;
	}

	/**
	 * Returns errors
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[]} errors
	 */
	getErrors(moduleGraph) {
		return null;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {}

	/**
	 * implement this method to allow the occurrence order plugin to count correctly
	 * @returns {number} count how often the id is used in this dependency
	 */
	getNumberOfIdOccurrences() {
		return 1;
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this dependency connects the module to referencing modules
	 */
	getModuleEvaluationSideEffectsState(moduleGraph) {
		return true;
	}

	serialize({ write }) {
		write(this.weak);
		write(this.optional);
		write(this.loc);
	}

	deserialize({ read }) {
		this.weak = read();
		this.optional = read();
		this.loc = read();
	}
}

Dependency.NO_EXPORTS_REFERENCED = [];
Dependency.EXPORTS_OBJECT_REFERENCED = [[]];

Object.defineProperty(Dependency.prototype, "module", {
	/**
	 * @deprecated
	 * @returns {never} throws
	 */
	get() {
		throw new Error(
			"module property was removed from Dependency (use compilation.moduleGraph.getModule(dependency) instead)"
		);
	},

	/**
	 * @deprecated
	 * @returns {never} throws
	 */
	set() {
		throw new Error(
			"module property was removed from Dependency (use compilation.moduleGraph.updateModule(dependency, module) instead)"
		);
	}
});

Object.defineProperty(Dependency.prototype, "disconnect", {
	get() {
		throw new Error(
			"disconnect was removed from Dependency (Dependency no longer carries graph specific information)"
		);
	}
});

module.exports = Dependency;
