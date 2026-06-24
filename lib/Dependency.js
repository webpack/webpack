/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const memoize = require("./util/memoize");

/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("./ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./errors/WebpackError")} WebpackError */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./util/Hash")} Hash */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("./dependencies/ModuleDependency")} ModuleDependency */
/**
 * Defines the update hash context type used by this module.
 * @typedef {object} UpdateHashContext
 * @property {ChunkGraph} chunkGraph
 * @property {RuntimeSpec} runtime
 * @property {RuntimeTemplate=} runtimeTemplate
 */

/**
 * Defines the source position type used by this module.
 * @typedef {object} SourcePosition
 * @property {number} line
 * @property {number=} column
 */

/**
 * Defines the real dependency location type used by this module.
 * @typedef {object} RealDependencyLocation
 * @property {SourcePosition} start
 * @property {SourcePosition=} end
 * @property {number=} index
 */

/**
 * Defines the synthetic dependency location type used by this module.
 * @typedef {object} SyntheticDependencyLocation
 * @property {string} name
 * @property {number=} index
 */

/** @typedef {SyntheticDependencyLocation | RealDependencyLocation} DependencyLocation */

/** @typedef {string} ExportInfoName */

/**
 * Defines the export spec type used by this module.
 * @typedef {object} ExportSpec
 * @property {ExportInfoName} name the name of the export
 * @property {boolean=} canMangle can the export be renamed (defaults to true)
 * @property {boolean=} terminalBinding is the export a terminal binding that should be checked for export star conflicts
 * @property {boolean=} isPure calling this export has no observable side effects
 * @property {(string | ExportSpec)[]=} exports nested exports
 * @property {ModuleGraphConnection=} from when reexported: from which module
 * @property {string[] | null=} export when reexported: from which export
 * @property {number=} priority when reexported: with which priority
 * @property {boolean=} hidden export is not visible, because another export blends over it
 * @property {import("./optimize/InlineExports").InlinedValue=} inlined when set: the export binds to a small primitive constant eligible for inlining
 */

/** @typedef {Set<string>} ExportsSpecExcludeExports */

/**
 * Defines the exports spec type used by this module.
 * @typedef {object} ExportsSpec
 * @property {(string | ExportSpec)[] | true | null} exports exported names, true for unknown exports or null for no exports
 * @property {ExportsSpecExcludeExports=} excludeExports when exports = true, list of unaffected exports
 * @property {(Set<string> | null)=} hideExports list of maybe prior exposed, but now hidden exports
 * @property {ModuleGraphConnection=} from when reexported: from which module
 * @property {number=} priority when reexported: with which priority
 * @property {boolean=} canMangle can the export be renamed (defaults to true)
 * @property {boolean=} terminalBinding are the exports terminal bindings that should be checked for export star conflicts
 * @property {boolean=} isPure calling these exports has no observable side effects
 * @property {Module[]=} dependencies module on which the result depends on
 */

/**
 * Defines the referenced export type used by this module.
 * @typedef {object} ReferencedExport
 * @property {string[]} name name of the referenced export
 * @property {boolean=} canMangle when false, referenced export can not be mangled, defaults to true
 * @property {boolean=} canInline when false, the referenced export can not be substituted with an inlined literal at this site, defaults to true
 */

/** @typedef {string[][]} RawReferencedExports */
/** @typedef {(string[] | ReferencedExport)[]} ReferencedExports */

/** @typedef {(moduleGraphConnection: ModuleGraphConnection, runtime: RuntimeSpec) => ConnectionState} GetConditionFn */

/**
 * Lazy barrel classification of a dependency within a side-effect-free module.
 * `LAZY_UNTIL_LOCAL`: locally provided export name (`getLazyName`), requesting it requires no dependency.
 * `LAZY_UNTIL_ID`: named re-export (`getLazyName`) deferred until the export name is requested.
 * `LAZY_UNTIL_FALLBACK`: star re-export, deferred until an unknown name or all names are requested.
 * `LAZY_UNTIL_REQUEST`: deferred together with other dependencies of the same request.
 * @typedef {"local" | "id" | "*" | "@"} LazyUntil
 */

const LAZY_UNTIL_LOCAL = /** @type {"local"} */ ("local");
const LAZY_UNTIL_ID = /** @type {"id"} */ ("id");
const LAZY_UNTIL_FALLBACK = /** @type {"*"} */ ("*");
const LAZY_UNTIL_REQUEST = /** @type {"@"} */ ("@");

const TRANSITIVE = /** @type {symbol} */ (Symbol("transitive"));

const getIgnoredModule = memoize(() => {
	const RawModule = require("./RawModule");

	const module = new RawModule("/* (ignored) */", "ignored", "(ignored)");
	module.factoryMeta = { sideEffectFree: true };
	return module;
});

class Dependency {
	constructor() {
		/** @type {Module | undefined} */
		this._parentModule = undefined;
		/** @type {DependenciesBlock | undefined} */
		this._parentDependenciesBlock = undefined;
		/** @type {number} */
		this._parentDependenciesBlockIndex = -1;
		// stays on base: also set on ContextDependency, which is not a ModuleDependency
		/** @type {boolean | undefined} */
		this.optional = false;
		/** @type {number} */
		this._locSL = 0;
		/** @type {number} */
		this._locSC = 0;
		/** @type {number} */
		this._locEL = 0;
		/** @type {number} */
		this._locEC = 0;
		/** @type {undefined | number} */
		this._locI = undefined;
		/** @type {undefined | string} */
		this._locN = undefined;
		/** @type {undefined | DependencyLocation} */
		this._loc = undefined;
	}

	/**
	 * Returns a display name for the type of dependency.
	 * @returns {string} a display name for the type of dependency
	 */
	get type() {
		return "unknown";
	}

	/**
	 * Returns a dependency category, typical categories are "commonjs", "amd", "esm".
	 * @returns {string} a dependency category, typical categories are "commonjs", "amd", "esm"
	 */
	get category() {
		return "unknown";
	}

	/**
	 * Returns location.
	 * @returns {DependencyLocation} location
	 */
	get loc() {
		if (this._loc !== undefined) return this._loc;

		/** @type {SyntheticDependencyLocation & RealDependencyLocation} */
		const loc = {};

		if (this._locSL > 0) {
			loc.start = { line: this._locSL, column: this._locSC };
		}
		if (this._locEL > 0) {
			loc.end = { line: this._locEL, column: this._locEC };
		}
		if (this._locN !== undefined) {
			loc.name = this._locN;
		}
		if (this._locI !== undefined) {
			loc.index = this._locI;
		}

		return (this._loc = loc);
	}

	set loc(loc) {
		if ("start" in loc && typeof loc.start === "object") {
			this._locSL = loc.start.line || 0;
			this._locSC = loc.start.column || 0;
		} else {
			this._locSL = 0;
			this._locSC = 0;
		}
		if ("end" in loc && typeof loc.end === "object") {
			this._locEL = loc.end.line || 0;
			this._locEC = loc.end.column || 0;
		} else {
			this._locEL = 0;
			this._locEC = 0;
		}
		this._locI = "index" in loc ? loc.index : undefined;
		this._locN = "name" in loc ? loc.name : undefined;
		// Don't retain the passed object; `get loc` rebuilds it from the numbers
		// above on demand, so dependencies whose loc is never read hold 4 numbers
		// instead of a SourceLocation + two Position objects.
		this._loc = undefined;
	}

	/**
	 * Updates loc using the provided start line.
	 * @param {number} startLine start line
	 * @param {number} startColumn start column
	 * @param {number} endLine end line
	 * @param {number} endColumn end column
	 */
	setLoc(startLine, startColumn, endLine, endColumn) {
		this._locSL = startLine;
		this._locSC = startColumn;
		this._locEL = endLine;
		this._locEC = endColumn;
		this._locI = undefined;
		this._locN = undefined;
		this._loc = undefined;
	}

	/**
	 * Updates loc from a source location plus an explicit index, without
	 * materializing the `loc` object (keeps `get loc` lazy). Replaces the
	 * `dep.loc = Object.create(loc); dep.loc.index = i` pattern, which both
	 * allocated a copy and stored the index outside the serialized fields.
	 * @param {DependencyLocation} loc source location (start/end/name read from it)
	 * @param {number} index dependency index within the statement
	 */
	setLocWithIndex(loc, index) {
		this.loc = loc;
		this._locI = index;
	}

	/**
	 * Compares two dependencies by source location for sorting a module's
	 * `dependencies`, without materializing the `loc` objects (`get loc` caches
	 * its result, so comparing through it would retain a location object on every
	 * sorted dependency). These dependencies always carry a real source position,
	 * so only start (line, column) and the within-statement index are compared; a
	 * dependency without an index sorts after one that has an index at the same
	 * position.
	 * @param {Dependency} a first dependency
	 * @param {Dependency} b second dependency
	 * @returns {-1 | 0 | 1} compare result
	 */
	static compareLocations(a, b) {
		if (a._locSL !== b._locSL) return a._locSL < b._locSL ? -1 : 1;
		if (a._locSC !== b._locSC) return a._locSC < b._locSC ? -1 : 1;
		const ai = a._locI;
		const bi = b._locI;
		if (ai === bi) return 0;
		if (ai === undefined) return 1;
		if (bi === undefined) return -1;
		return ai < bi ? -1 : 1;
	}

	/**
	 * Returns a request context.
	 * @returns {string | undefined} a request context
	 */
	getContext() {
		return undefined;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return null;
	}

	/**
	 * Could affect referencing module.
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		return TRANSITIVE;
	}

	/**
	 * Returns the export name this dependency requests from its target module (lazy barrel optimization).
	 * @returns {string | true | null} export name, true for all exports, null for none
	 */
	getForwardId() {
		// unknown dependency types conservatively request all exports
		return true;
	}

	/**
	 * Returns how this dependency may be deferred when its parent module is side-effect-free (lazy barrel optimization).
	 * @returns {LazyUntil | null} lazy classification, null when it must be processed eagerly
	 */
	getLazyUntil() {
		return null;
	}

	/**
	 * Returns the export name for a `LAZY_UNTIL_LOCAL`/`LAZY_UNTIL_ID` classification (lazy barrel optimization).
	 * @returns {string | null} export name, null when not applicable
	 */
	getLazyName() {
		return null;
	}

	/**
	 * Whether the lazy barrel currently defers creating this dependency's target module (lazy barrel optimization).
	 * @returns {boolean} true while deferred, so it must not be processed or rendered
	 */
	isLazy() {
		return false;
	}

	/**
	 * Sets whether the lazy barrel defers creating this dependency's target module (lazy barrel optimization).
	 * @param {boolean} value true to defer, false to create it now
	 */
	setLazy(value) {}

	/**
	 * Returns the referenced module and export
	 * @deprecated
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {never} throws error
	 */
	getReference(moduleGraph) {
		throw new Error(
			"Dependency.getReference was removed in favor of Dependency.getReferencedExports, ModuleGraph.getModule, ModuleGraph.getConnection(), and ModuleGraphConnection.getActiveState(runtime)"
		);
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return Dependency.EXPORTS_OBJECT_REFERENCED;
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
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
	 * Returns warnings.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		return null;
	}

	/**
	 * Returns errors.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} errors
	 */
	getErrors(moduleGraph) {
		return null;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
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
	 * Gets module evaluation side effects state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this dependency connects the module to referencing modules
	 */
	getModuleEvaluationSideEffectsState(moduleGraph) {
		return true;
	}

	/**
	 * Creates an ignored module.
	 * @param {string} context context directory
	 * @returns {Module} ignored module
	 */
	createIgnoredModule(context) {
		return getIgnoredModule();
	}

	/**
	 * Returns true if this dependency can be concatenated
	 * @returns {boolean} true if this dependency can be concatenated
	 */
	canConcatenate() {
		return false;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize({ write }) {
		write(this.optional);
		write(this._locSL);
		write(this._locSC);
		write(this._locEL);
		write(this._locEC);
		write(this._locI);
		write(this._locN);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize({ read }) {
		this.optional = read();
		this._locSL = read();
		this._locSC = read();
		this._locEL = read();
		this._locEC = read();
		this._locI = read();
		this._locN = read();
	}
}

/** @type {RawReferencedExports} */
Dependency.NO_EXPORTS_REFERENCED = [];
/** @type {RawReferencedExports} */
Dependency.EXPORTS_OBJECT_REFERENCED = [[]];
// Like EXPORTS_OBJECT_REFERENCED, but the reference can be rendered as a
// decoupled namespace object, so the module's exports stay mangleable.
// Same shape as EXPORTS_OBJECT_REFERENCED; only distinguished by identity.
/** @type {RawReferencedExports} */
Dependency.EXPORTS_OBJECT_REFERENCED_MANGLEABLE = [[]];

// TODO remove in webpack 6
Object.defineProperty(Dependency.prototype, "module", {
	/**
	 * Returns throws.
	 * @deprecated
	 * @returns {EXPECTED_ANY} throws
	 */
	get() {
		throw new Error(
			"module property was removed from Dependency (use compilation.moduleGraph.getModule(dependency) instead)"
		);
	},

	/**
	 * Updates module.
	 * @deprecated
	 * @returns {never} throws
	 */
	set() {
		throw new Error(
			"module property was removed from Dependency (use compilation.moduleGraph.updateModule(dependency, module) instead)"
		);
	}
});

/**
 * Returns true if the dependency is a low priority dependency.
 * @param {Dependency} dependency dep
 * @returns {boolean} true if the dependency is a low priority dependency
 */
Dependency.isLowPriorityDependency = (dependency) =>
	/** @type {ModuleDependency} */ (dependency).sourceOrder === Infinity;

// TODO in webpack 6, call canConcatenate() directly on the dependency instance instead of using this static method.
/**
 * Returns true if the dependency can be concatenated (scope hoisting).
 * @param {Dependency} dependency dep
 * @returns {boolean} true if this dependency supports concatenation
 */
Dependency.canConcatenate = (dependency) => {
	if (typeof dependency.canConcatenate === "function") {
		return dependency.canConcatenate();
	}
	return false;
};

// TODO remove in webpack 6
Object.defineProperty(Dependency.prototype, "disconnect", {
	/**
	 * Returns throws.
	 * @deprecated
	 * @returns {EXPECTED_ANY} throws
	 */
	get() {
		throw new Error(
			"disconnect was removed from Dependency (Dependency no longer carries graph specific information)"
		);
	}
});

Dependency.TRANSITIVE = TRANSITIVE;
Dependency.LAZY_UNTIL_LOCAL = LAZY_UNTIL_LOCAL;
Dependency.LAZY_UNTIL_ID = LAZY_UNTIL_ID;
Dependency.LAZY_UNTIL_FALLBACK = LAZY_UNTIL_FALLBACK;
Dependency.LAZY_UNTIL_REQUEST = LAZY_UNTIL_REQUEST;

module.exports = Dependency;
