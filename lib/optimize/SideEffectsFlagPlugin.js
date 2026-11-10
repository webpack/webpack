/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ImportPhaseUtils } = require("../dependencies/core/ImportPhase");
const ESMExports = require("../dependencies/esm/ESMExports");
const { dirname, join, readJson, relative } = require("../fs/fs");
const isDependencyKind = require("../graph/isDependencyKind");
const { Field, NodeType, Part } = require("../javascript/syntax-parser");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const {
	getBuildDiagnostics,
	recordOptimizationBailout
} = require("../util/buildDiagnostics");
const formatLocation = require("../util/formatLocation");
const { getGlobToRegExpSource } = require("../util/globUtils");
const {
	NODE_MODULES_REGEXP,
	WINDOWS_PATH_SEPARATOR_REGEXP,
	relativePathToRequest
} = require("../util/identifier");
const { CompilerHintNotationRegExp } = require("../util/magicComment");
const { STAGE_DEFAULT } = require("./OptimizationStages");

/**
 * @import {
 * 	AssignmentExpression,
 * 	Expression,
 * 	Literal,
 * 	MaybeNamedClassDeclaration,
 * 	MaybeNamedFunctionDeclaration,
 * 	ModuleDeclaration,
 * 	MemberExpression,
 * 	Statement,
 * 	CallExpression,
 * 	VariableDeclaration
 * } from "estree"
 */
/** @import ESMExportImportedSpecifierDependency from "../dependencies/esm/ESMExportImportedSpecifierDependency" */
/** @import Compiler from "../Compiler" */
/** @import Dependency from "../graph/Dependency" */
/** @import Module from "../module/Module" */
/** @import ModuleGraphConnection from "../graph/ModuleGraphConnection" */
/** @import { ExportInfo, TargetItemWithConnection } from "../graph/ExportsInfo" */
/** @import JavascriptParser, { Range } from "../javascript/JavascriptParser" */
/** @import { InputFileSystem } from "../fs/fs" */
/** @import { CreateData, ResolveData } from "../module/NormalModuleFactory" */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../declarations/WebpackOptions"
 */

/**
 * Defines the export in module type used by this module.
 * @typedef {object} ExportInModule
 * @property {Module} module the module
 * @property {string} exportName the name of the export
 * @property {boolean} checked if the export is conditional
 */

/** @typedef {NonNullable<CreateData["resourceResolveData"]>} ResourceResolveData */

/** @typedef {string | boolean | string[] | undefined} SideEffectsFlagValue */

/** @typedef {Map<string, RegExp>} CacheItem */

/**
 * @typedef {object} ResolvedSideEffectsFlag
 * @property {SideEffectsFlagValue} sideEffects package.json sideEffects value
 * @property {string} relativePath path relative to the owning package root
 */

/**
 * @typedef {object} OwningSideEffectsFlag
 * @property {SideEffectsFlagValue} sideEffects package.json sideEffects value
 * @property {string} packageRoot directory of the declaring package.json
 */

/**
 * A finished ancestor walk, kept per descriptionFileRoot. The package.json
 * paths it consulted are replayed as dependencies for every module reusing it.
 * @typedef {object} OwningSideEffectsFlagWalk
 * @property {OwningSideEffectsFlag | null} owning declaring package, `null` when the walk found none
 * @property {string[]} read package.json files the walk read
 * @property {string[]} missing package.json files the walk did not find
 */

/** @typedef {Map<string, OwningSideEffectsFlagWalk>} OwningSideEffectsFlagCache */

/**
 * Whether a resolved re-export target is reached through an `import defer` edge.
 * Such edges must not be collapsed by the side-effect-free barrel optimization:
 * the source module has to keep being reached through the barrel's cached
 * deferred namespace so deferred-namespace identity and evaluation semantics are
 * preserved.
 * @param {ModuleGraphConnection | undefined} connection the target connection
 * @returns {boolean} true when the target connection is a deferred import
 */
const isDeferredTargetConnection = (connection) =>
	connection !== undefined &&
	connection.dependency !== null &&
	isDependencyKind(connection.dependency, "esm-import") &&
	ImportPhaseUtils.isDefer(connection.dependency.phase);

/** @type {WeakMap<Compiler, CacheItem>} */
const globToRegexpCache = new WeakMap();

/** @type {WeakMap<Compiler, OwningSideEffectsFlagCache>} */
const owningSideEffectsFlagCache = new WeakMap();

/** @type {WeakMap<Partial<CreateData>, ResolvedSideEffectsFlag>} */
const resolvedSideEffectsFlags = new WeakMap();

/**
 * Whether a failed ancestor package.json read means nothing is there, as
 * opposed to something being there that cannot be used.
 * @param {NodeJS.ErrnoException | SyntaxError | Error} err error from readJson
 * @returns {boolean} true when no file was found at that path
 */
const isMissingPackageJsonError = (err) =>
	"code" in err && err.code === "ENOENT";

/**
 * Returns a regular expression.
 * @param {string} glob the pattern
 * @param {CacheItem} cache the glob to RegExp cache
 * @returns {RegExp} a regular expression
 */
const globToRegexp = (glob, cache) => {
	const cacheEntry = cache.get(glob);
	if (cacheEntry !== undefined) return cacheEntry;
	if (!glob.includes("/")) {
		glob = `**/${glob}`;
	}
	const regexpSource = getGlobToRegExpSource()(glob);
	const regexp = new RegExp(`^(\\./)?${regexpSource}$`);
	cache.set(glob, regexp);
	return regexp;
};

/**
 * @param {JavascriptParser} parser parser
 * @param {number} start start position
 * @param {number} end end position
 * @returns {boolean} if annotation is found in the range
 */
const hasNoSideEffectsNotation = (parser, start, end) => {
	// Fast path
	if (end - start < 18) return false;

	const comments = parser.getComments([start, end]);
	return comments.some(
		(c) =>
			c.type === "Block" &&
			CompilerHintNotationRegExp.NoSideEffects.test(c.value)
	);
};

/**
 * @typedef {object} CommonJsExportsWrites
 * @property {boolean} property an ignored write assigned an `exports.<key>`
 * @property {boolean} accessor an ignored `Object.defineProperty` may have installed a getter or setter
 * @property {boolean} replaced `module.exports` was set to an object the module may not own
 * @property {boolean} defined an ignored `Object.defineProperty` targeted `module.exports`
 * @property {boolean} conflict an ignored write or definition throws on a key an `Object.defineProperty` locked
 * @property {Map<string, number> | undefined} keys the `KEY_*` flags of each key written or defined
 * @property {CallExpression[] | undefined} requires the ignored `require()` calls, each owing a dependency
 */

const KEY_WRITTEN = 1;
const KEY_DEFINED = 2;
const KEY_REDEFINED = 4;
// defined without `writable: true` as a data property, so a strict-mode write throws
const KEY_READONLY = 8;
// defined without `configurable: true`, so defining it again throws
const KEY_FIXED = 16;

/**
 * Records a write or definition of an exports key and flags the pairs that throw.
 * @param {CommonJsExportsWrites} writes the ignored writes
 * @param {string} key the exports key
 * @param {number} flags the `KEY_*` flags of this write or definition
 */
const recordKey = (writes, key, flags) => {
	let { keys } = writes;
	if (keys === undefined) {
		keys = new Map();
		writes.keys = keys;
	}
	const previous = keys.get(key) || 0;
	let next = previous | flags;
	if (previous & flags & KEY_DEFINED) next |= KEY_REDEFINED;
	keys.set(key, next);
	// a loop can run either of the pair first, so the order in source doesn't matter
	if (
		(next & KEY_WRITTEN && next & KEY_READONLY) ||
		(next & KEY_REDEFINED && next & KEY_FIXED)
	) {
		writes.conflict = true;
	}
};

/**
 * @param {MemberExpression} member the member expression
 * @returns {string | undefined} the key when it is a static name or string literal
 */
const getStaticKey = (member) => {
	const property = member.property;
	if (!member.computed && property.type === "Identifier") {
		return property.name;
	}
	if (
		member.computed &&
		property.type === "Literal" &&
		typeof property.value === "string"
	) {
		return property.value;
	}
};

/**
 * @param {JavascriptParser} parser the parser
 * @param {string} name a free variable name
 * @returns {boolean} true when the name refers to the CommonJS binding of that name
 */
const isCommonJsFreeVariable = (parser, name) =>
	// under ESM `exports` is not the module's exports object
	!ESMExports.isEnabled(parser.state) && !parser.isVariableDefined(name);

/**
 * Whether the expression is `require("<request>")` with the module's own `require`.
 * Only the call is ignored; its dependency carries the required module's side effects.
 * @param {JavascriptParser} parser the parser
 * @param {Expression} expr the expression
 * @param {CommonJsExportsWrites} writes records the ignored call
 * @returns {boolean} true when the call is not a side effect of the module by itself
 */
const isCommonJsRequireCall = (parser, expr, writes) => {
	if (
		expr.type !== "CallExpression" ||
		expr.callee.type !== "Identifier" ||
		expr.callee.name !== "require" ||
		expr.arguments.length !== 1
	) {
		return false;
	}
	const request = expr.arguments[0];
	if (
		request.type !== "Literal" ||
		typeof request.value !== "string" ||
		!isCommonJsFreeVariable(parser, "require")
	) {
		return false;
	}
	if (writes.requires === undefined) writes.requires = [expr];
	else writes.requires.push(expr);
	return true;
};

/**
 * Finds an ignored `require()` call that did not become a require dependency, so
 * it runs as written: `webpackIgnore`, a replaced `require`, or an export of the call.
 * @param {Dependency[]} dependencies the module's dependencies
 * @param {CallExpression[]} requires the ignored calls
 * @returns {CallExpression | undefined} the first call without one
 */
const findRequireWithoutDependency = (dependencies, requires) => {
	/** @type {Set<number>} */
	const starts = new Set();
	for (const dependency of dependencies) {
		if (isDependencyKind(dependency, "commonjs-require")) {
			starts.add(/** @type {Range} */ (dependency.range)[0]);
		}
	}
	return requires.find(
		(call) => !starts.has(/** @type {Range} */ (call.arguments[0].range)[0])
	);
};

/**
 * Whether the assignment writes the module's own exports: `exports.x = …` or `module.exports = …`.
 * Only the write is ignored; the assigned value is still judged by `isPure`.
 * @param {JavascriptParser} parser the parser
 * @param {AssignmentExpression} expr the assignment
 * @param {CommonJsExportsWrites} writes records the ignored write
 * @returns {boolean} true when the write is ignored for module-evaluation side effects
 */
const isCommonJsExportAssignment = (parser, expr, writes) => {
	const left = expr.left;
	if (
		expr.operator !== "=" ||
		left.type !== "MemberExpression" ||
		left.object.type !== "Identifier"
	) {
		return false;
	}
	const name = left.object.name;
	const key = getStaticKey(left);
	if (
		key === undefined ||
		(name === "exports"
			? key === "__proto__"
			: name !== "module" || key !== "exports") ||
		!isCommonJsFreeVariable(parser, name)
	) {
		return false;
	}
	if (name === "exports") {
		writes.property = true;
		recordKey(writes, key, KEY_WRITTEN);
	} else if (
		// `Object.defineProperty` defines an own property, so only the object itself has to be fresh
		expr.right.type !== "ObjectExpression" &&
		expr.right.type !== "ArrayExpression"
	) {
		writes.replaced = true;
	}
	return true;
};

/**
 * Whether the call is `Object.defineProperty(exports, "<key>", { … })` on the module's own exports.
 * Only the definition is ignored; the descriptor is still judged by `isPure`.
 * @param {JavascriptParser} parser the parser
 * @param {CallExpression} expr the call
 * @param {CommonJsExportsWrites} writes records the ignored definition
 * @returns {boolean} true when the call is not a side effect of the module
 */
const isCommonJsDefinePropertyPure = (parser, expr, writes) => {
	const callee = expr.callee;
	if (
		callee.type !== "MemberExpression" ||
		callee.object.type !== "Identifier" ||
		callee.object.name !== "Object" ||
		getStaticKey(callee) !== "defineProperty" ||
		parser.isVariableDefined("Object") ||
		expr.arguments.length !== 3
	) {
		return false;
	}
	const [target, key, descriptor] = expr.arguments;
	if (
		key.type !== "Literal" ||
		typeof key.value !== "string" ||
		descriptor.type !== "ObjectExpression"
	) {
		return false;
	}
	/** @type {string} */
	let name;
	if (target.type === "Identifier" && target.name === "exports") {
		name = "exports";
	} else if (
		target.type === "MemberExpression" &&
		target.object.type === "Identifier" &&
		target.object.name === "module" &&
		getStaticKey(target) === "exports"
	) {
		name = "module";
	} else {
		return false;
	}
	if (!isCommonJsFreeVariable(parser, name)) return false;
	let hasValue = false;
	let hasAccessor = false;
	let writable = false;
	let configurable = false;
	for (const property of descriptor.properties) {
		// `{ get value() { … } }` runs the getter when the descriptor is read
		if (property.type !== "Property" || property.kind !== "init") return false;
		if (property.computed) {
			writes.accessor = true;
			hasAccessor = true;
		} else {
			const descriptorKey = property.key;
			// a key that isn't computed is an identifier or a literal
			const keyName =
				descriptorKey.type === "Identifier"
					? descriptorKey.name
					: /** @type {Literal} */ (descriptorKey).value;
			// a prototype makes the descriptor read inherited fields, which may be getters
			if (keyName === "__proto__") return false;
			if (keyName === "get" || keyName === "set") {
				writes.accessor = true;
				hasAccessor = true;
			} else if (keyName === "value") {
				hasValue = true;
			} else if (keyName === "writable" || keyName === "configurable") {
				const isTrue =
					property.value.type === "Literal" && property.value.value === true;
				if (keyName === "writable") {
					hasValue = true;
					writable = isTrue;
				} else {
					configurable = isTrue;
				}
			}
		}
	}
	// a descriptor with both a value and an accessor throws a TypeError
	if (hasValue && hasAccessor) return false;
	recordKey(
		writes,
		key.value,
		KEY_DEFINED |
			(configurable ? 0 : KEY_FIXED) |
			(hasAccessor || writable ? 0 : KEY_READONLY)
	);
	if (name === "module") writes.defined = true;
	return parser.isPure(descriptor, /** @type {Range} */ (key.range)[1]);
};

/**
 * Whether evaluating the expression has no effect beyond writing the module's own exports.
 * @param {JavascriptParser} parser the parser
 * @param {Expression} expr the expression
 * @param {number} commentsStartPos where comments annotating the expression may start
 * @param {CommonJsExportsWrites} writes records the ignored writes
 * @returns {boolean} true when the expression is not a side effect of the module
 */
const isModuleEvaluationPure = (parser, expr, commentsStartPos, writes) => {
	while (
		expr.type === "AssignmentExpression" &&
		isCommonJsExportAssignment(parser, expr, writes)
	) {
		commentsStartPos = /** @type {Range} */ (expr.left.range)[1];
		expr = expr.right;
	}
	if (
		expr.type === "CallExpression" &&
		(isCommonJsDefinePropertyPure(parser, expr, writes) ||
			isCommonJsRequireCall(parser, expr, writes))
	) {
		return true;
	}
	return parser.isPure(expr, commentsStartPos);
};

/**
 * @param {JavascriptParser} parser the parser
 * @param {VariableDeclaration} declaration a top-level declaration
 * @param {CommonJsExportsWrites} writes records the ignored writes
 * @returns {boolean} true when evaluating the declaration is not a side effect of the module
 */
const isModuleEvaluationPureDeclaration = (parser, declaration, writes) =>
	// a `using` binding disposes its value when the module finishes
	declaration.kind !== "using" &&
	declaration.kind !== "await using" &&
	declaration.declarations.every(
		(declarator) =>
			// a pattern reads members of the value, which may run a getter
			declarator.id.type === "Identifier" &&
			(!declarator.init ||
				isModuleEvaluationPure(
					parser,
					declarator.init,
					/** @type {Range} */ (declarator.range)[0],
					writes
				))
	);

const PLUGIN_NAME = "SideEffectsFlagPlugin";

const notSideEffectsTag = Symbol("NoSideEffects");

/** @type {(target: { module: Module }) => boolean} */
const RETURNS_FALSE = () => false;

/**
 * Resolve sideEffects from the package that declares it, inheriting past a nested
 * package.json that declares none. Globs are rebased on the declaring package root,
 * and each package.json the walk consults becomes a dependency of the resolve.
 * @param {InputFileSystem} fs file system
 * @param {ResolveData} resolveData resolve data
 * @param {string} descriptionFileRoot root directory of the nearest description file
 * @param {OwningSideEffectsFlagCache} owningCache walk cache keyed by descriptionFileRoot
 * @param {(result?: ResolvedSideEffectsFlag) => void} callback callback
 * @returns {void}
 */
const resolveSideEffectsFlag = (
	fs,
	resolveData,
	descriptionFileRoot,
	owningCache,
	callback
) => {
	const resolveInfo = /** @type {ResourceResolveData} */ (
		resolveData.createData.resourceResolveData
	);
	const descriptionFileData =
		/** @type {NonNullable<ResourceResolveData["descriptionFileData"]>} */ (
			resolveInfo.descriptionFileData
		);
	const relativePath = /** @type {string} */ (resolveInfo.relativePath);
	if (descriptionFileData.sideEffects !== undefined) {
		return callback({
			sideEffects: /** @type {SideEffectsFlagValue} */ (
				descriptionFileData.sideEffects
			),
			relativePath
		});
	}
	// Named package with no sideEffects: do not inherit from outside.
	if (descriptionFileData.name !== undefined) {
		return callback();
	}
	// Only inherit for a file living under node_modules; app-local nests keep shadowing.
	// Read the resolved path so a symlinked package flags all of its files alike.
	if (
		typeof resolveInfo.path !== "string" ||
		!NODE_MODULES_REGEXP.test(resolveInfo.path)
	) {
		return callback();
	}

	// stays in descriptionFileRoot's space, which is the space packageRoot is found in
	const resourcePath = join(fs, descriptionFileRoot, relativePath);

	/**
	 * @param {OwningSideEffectsFlagWalk} walk finished walk
	 * @returns {void}
	 */
	const finishFromWalk = (walk) => {
		for (const file of walk.read) resolveData.fileDependencies.add(file);
		for (const file of walk.missing) resolveData.missingDependencies.add(file);
		const owning = walk.owning;
		if (owning === null) return callback();
		const ancestorRelative = relative(
			fs,
			owning.packageRoot,
			resourcePath
		).replace(WINDOWS_PATH_SEPARATOR_REGEXP, "/");
		return callback({
			sideEffects: owning.sideEffects,
			relativePath: relativePathToRequest(ancestorRelative)
		});
	};

	const cached = owningCache.get(descriptionFileRoot);
	if (cached !== undefined) {
		return finishFromWalk(cached);
	}

	/** @type {string[]} */
	const read = [];
	/** @type {string[]} */
	const missing = [];

	/**
	 * @param {OwningSideEffectsFlag | null} owning declaring package or null
	 * @returns {void}
	 */
	const done = (owning) => {
		/** @type {OwningSideEffectsFlagWalk} */
		const walk = { owning, read, missing };
		owningCache.set(descriptionFileRoot, walk);
		return finishFromWalk(walk);
	};

	let dir = dirname(fs, descriptionFileRoot);

	const next = () => {
		const parent = dirname(fs, dir);
		if (!parent || parent === dir) return done(null);
		const baseName = relative(fs, parent, dir).replace(
			WINDOWS_PATH_SEPARATOR_REGEXP,
			"/"
		);
		// Do not inherit an application's sideEffects across an install boundary.
		if (baseName === "node_modules") return done(null);

		const packageJsonPath = join(fs, dir, "package.json");

		readJson(fs, packageJsonPath, (err, data) => {
			if (err) {
				if (!isMissingPackageJsonError(err)) {
					// it is there but unreadable, so what it declares is unknown:
					// decline rather than let an outer flag speak for it
					read.push(packageJsonPath);
					return done(null);
				}
				missing.push(packageJsonPath);
				dir = parent;
				return next();
			}
			read.push(packageJsonPath);
			if (!data || typeof data !== "object" || Array.isArray(data)) {
				dir = parent;
				return next();
			}
			if (data.sideEffects !== undefined) {
				return done({
					sideEffects: /** @type {SideEffectsFlagValue} */ (data.sideEffects),
					packageRoot: dir
				});
			}
			// An unnamed manifest deeper in the package keeps the walk going; a named one
			// is a package of its own, and its silence is its answer.
			if (data.name !== undefined) return done(null);
			dir = parent;
			next();
		});
	};
	next();
};

/**
 * Detects if the module is "pure single-star passthrough": one whose entire export
 * surface is exactly one `export * from "x"` (no named/local/default-bearing
 * exports, no second star). For such a module `export * from "passthrough"` is
 * equivalent to `export * from "x"`, so the passthrough can be skipped.
 * @param {Module} module the candidate passthrough module
 * @returns {boolean} true when the module is a pure single-star passthrough
 */
const moduleHasSingleStarReexport = (module) => {
	/** @type {ESMExportImportedSpecifierDependency | undefined} */
	let starReexportDep;
	for (const dep of module.dependencies) {
		if (!isDependencyKind(dep, "esm-reexport")) continue;
		// a named re-export (`export { x } from` / `export * as ns from`) means
		// the module owns names a star into its source wouldn't reproduce
		if (dep.name !== null) return false;
		// any named/local export populates the shared activeExports set
		if (dep.activeExports.size !== 0) return false;
		// more than one `export *` can't be collapsed to a single source
		if (dep.allStarExports && dep.allStarExports.dependencies.length !== 1) {
			return false;
		}
		starReexportDep = dep;
	}
	if (starReexportDep === undefined) return false;
	return true;
};

class SideEffectsFlagPlugin {
	/**
	 * Creates an instance of SideEffectsFlagPlugin.
	 * @param {boolean} analyseSource analyse source code for side effects
	 */
	constructor(analyseSource = true) {
		/** @type {boolean} */
		this._analyseSource = analyseSource;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		let cache = globToRegexpCache.get(compiler.root);
		if (cache === undefined) {
			cache = new Map();
			globToRegexpCache.set(compiler.root, cache);
		}
		let owningCache = owningSideEffectsFlagCache.get(compiler.root);
		if (owningCache === undefined) {
			owningCache = new Map();
			owningSideEffectsFlagCache.set(compiler.root, owningCache);
		}
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const moduleGraph = compilation.moduleGraph;
				normalModuleFactory.hooks.afterResolve.tapAsync(
					PLUGIN_NAME,
					(resolveData, callback) => {
						const inputFileSystem = compiler.inputFileSystem;
						if (!inputFileSystem) return callback();
						const { createData } = resolveData;
						const resolveInfo = createData.resourceResolveData;
						if (
							!resolveInfo ||
							!resolveInfo.descriptionFileData ||
							!resolveInfo.relativePath
						) {
							return callback();
						}
						const descriptionFileRoot =
							resolveInfo.descriptionFileRoot ||
							(resolveInfo.descriptionFilePath
								? dirname(inputFileSystem, resolveInfo.descriptionFilePath)
								: undefined);
						if (descriptionFileRoot === undefined) return callback();
						resolveSideEffectsFlag(
							inputFileSystem,
							resolveData,
							descriptionFileRoot,
							owningCache,
							(resolved) => {
								if (resolved !== undefined) {
									resolvedSideEffectsFlags.set(createData, resolved);
								}
								callback();
							}
						);
					}
				);
				normalModuleFactory.hooks.module.tap(PLUGIN_NAME, (module, data) => {
					const resolved = resolvedSideEffectsFlags.get(data);
					if (resolved !== undefined) {
						if (module.factoryMeta === undefined) {
							module.factoryMeta = {};
						}
						const hasSideEffects = SideEffectsFlagPlugin.moduleHasSideEffects(
							resolved.relativePath,
							resolved.sideEffects,
							cache
						);
						module.factoryMeta.sideEffectFree = !hasSideEffects;
					}
					return module;
				});
				normalModuleFactory.hooks.module.tap(PLUGIN_NAME, (module, data) => {
					const settings = data.settings;
					if (typeof settings.sideEffects === "boolean") {
						if (module.factoryMeta === undefined) {
							module.factoryMeta = {};
						}
						module.factoryMeta.sideEffectFree = !settings.sideEffects;
					}
					return module;
				});
				if (this._analyseSource) {
					/**
					 * Processes the provided parser.
					 * @param {JavascriptParser} parser the parser
					 * @param {JavascriptParserOptions} parserOptions the parser options
					 * @returns {void}
					 */
					const applySideEffectsStmtHandler = (parser, parserOptions) => {
						// with CommonJS off, `exports` and `module` are the enclosing scope's bindings
						const commonjs =
							parserOptions.commonjs === undefined || parserOptions.commonjs;
						/** @type {undefined | Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | CallExpression} */
						let sideEffectsStatement;
						/** @type {CommonJsExportsWrites} */
						let writes;
						parser.hooks.program.tap({ name: PLUGIN_NAME, path: true }, () => {
							sideEffectsStatement = undefined;
							writes = {
								property: false,
								accessor: false,
								replaced: false,
								defined: false,
								conflict: false,
								keys: undefined,
								requires: undefined
							};
						});
						// every statement reaches this tap, so it takes an id and makes the
						// object only for a top-level statement
						parser.hooks.statement.tap(
							{ name: PLUGIN_NAME, stage: -100, path: true },
							(path, node) => {
								if (sideEffectsStatement) return;
								if (parser.scope.topLevelScope !== true) return;
								const statement = /** @type {Statement | ModuleDeclaration} */ (
									path.object(node)
								);
								switch (statement.type) {
									case "ExpressionStatement":
										if (
											!(commonjs
												? isModuleEvaluationPure(
														parser,
														statement.expression,
														/** @type {Range} */
														(statement.range)[0],
														writes
													)
												: parser.isPure(
														statement.expression,
														/** @type {Range} */
														(statement.range)[0]
													))
										) {
											sideEffectsStatement = statement;
										}
										break;
									case "IfStatement":
									case "WhileStatement":
									case "DoWhileStatement":
										if (
											!parser.isPure(
												statement.test,
												/** @type {Range} */
												(statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										// statement hook will be called for child statements too
										break;
									case "ForStatement":
										if (
											!parser.isPure(
												statement.init,
												/** @type {Range} */ (statement.range)[0]
											) ||
											!parser.isPure(
												statement.test,
												statement.init
													? /** @type {Range} */ (statement.init.range)[1]
													: /** @type {Range} */ (statement.range)[0]
											) ||
											!parser.isPure(
												statement.update,
												statement.test
													? /** @type {Range} */ (statement.test.range)[1]
													: statement.init
														? /** @type {Range} */ (statement.init.range)[1]
														: /** @type {Range} */ (statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										// statement hook will be called for child statements too
										break;
									case "SwitchStatement":
										if (
											!parser.isPure(
												statement.discriminant,
												/** @type {Range} */
												(statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										// statement hook will be called for child statements too
										break;
									case "VariableDeclaration":
										if (
											!parser.isPure(
												statement,
												/** @type {Range} */ (statement.range)[0]
											) &&
											!(
												commonjs &&
												isModuleEvaluationPureDeclaration(
													parser,
													statement,
													writes
												)
											)
										) {
											sideEffectsStatement = statement;
										}
										break;
									case "ClassDeclaration":
									case "FunctionDeclaration":
										if (
											!parser.isPure(
												statement,
												/** @type {Range} */ (statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										break;
									case "ExportNamedDeclaration":
									case "ExportDefaultDeclaration":
										if (
											!parser.isPure(
												statement.declaration,
												/** @type {Range} */
												(statement.range)[0]
											)
										) {
											sideEffectsStatement = statement;
										}
										break;
									case "LabeledStatement":
									case "BlockStatement":
										// statement hook will be called for child statements too
										break;
									case "EmptyStatement":
										break;
									case "ExportAllDeclaration":
									case "ImportDeclaration":
										// imports will be handled by the dependencies
										break;
									default:
										sideEffectsStatement = statement;
										break;
								}
								// an export write may run an accessor `Object.defineProperty` installed, and a
								// definition on a replaced `module.exports` reaches another object; a loop can
								// run either pair in any order, so source order doesn't matter
								if (
									!sideEffectsStatement &&
									((writes.property && writes.accessor) ||
										(writes.replaced && writes.defined) ||
										writes.conflict)
								) {
									sideEffectsStatement = statement;
								}
							}
						);
						parser.hooks.finish.tap({ name: PLUGIN_NAME, path: true }, () => {
							if (writes.requires !== undefined) {
								if (sideEffectsStatement === undefined) {
									sideEffectsStatement = findRequireWithoutDependency(
										parser.state.module.dependencies,
										writes.requires
									);
								}
								// don't retain the AST until the next module is parsed
								writes.requires = undefined;
							}
							if (sideEffectsStatement === undefined) {
								parser.state.module.buildMeta.sideEffectFree = true;
							} else {
								const type = sideEffectsStatement.type;
								const loc = parser.getLocation(sideEffectsStatement);
								const at = formatLocation(loc);

								const buildInfo = parser.state.module.buildInfo;
								recordOptimizationBailout(
									buildInfo,
									`Statement (${type}) with side effects in source code at ${at}`
								);
								// `performance.unusedModules` names the statement, so it is kept typed too.
								getBuildDiagnostics(buildInfo).sideEffectStatement =
									`${type} at ${at}`;
							}
						});
					};

					/**
					 * @param {JavascriptParser} parser the parser
					 * @param {JavascriptParserOptions} parserOptions the parser options
					 * @returns {void}
					 */
					const applyNoSideEffectsNotationHandler = (parser, parserOptions) => {
						/** @type {Set<string> | undefined} */
						let pureFunctions;

						const pureFunctionsFromOption =
							parserOptions &&
							Array.isArray(parserOptions.pureFunctions) &&
							parserOptions.pureFunctions.length > 0
								? new Set(parserOptions.pureFunctions)
								: undefined;

						parser.hooks.program.tap({ name: PLUGIN_NAME, path: true }, () => {
							pureFunctions = undefined;
						});

						/**
						 * @param {string} name function name
						 */
						const markPure = (name) => {
							if (pureFunctions === undefined) pureFunctions = new Set();
							else if (pureFunctions.has(name)) return;
							parser.tagVariable(name, notSideEffectsTag, {});
							pureFunctions.add(name);
						};

						// Covers a plain `function foo`, an exported one, and an
						// `export default` function whether named or anonymous.
						// these see every declaration, so they read ids
						parser.hooks.preStatementByType
							.for("FunctionDeclaration")
							.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
								if (parser.scope.topLevelScope !== true) return;
								if (path.type(node) !== NodeType.FunctionDeclaration) {
									return;
								}
								const id = path.field(0, Field.id, node);
								const name = id !== 0 ? path.name(id) : "default";
								const statement = parser.nodeOfPath(path, node);
								if (
									pureFunctionsFromOption &&
									pureFunctionsFromOption.has(name)
								) {
									markPure(name);
									return;
								}
								if (
									hasNoSideEffectsNotation(
										parser,
										parser.getAttachedCommentsStart(statement),
										path.start(node)
									)
								) {
									markPure(name);
								}
							});

						// Detect on variable declarations with function init
						parser.hooks.preDeclarator.tap(
							{ name: PLUGIN_NAME, path: true },
							(path, decl, statement) => {
								if (parser.scope.topLevelScope !== true) return;
								const id = path.field(0, Field.id, decl);
								if (path.type(id) !== NodeType.Identifier) return;
								const name = path.name(id);
								if (
									pureFunctionsFromOption &&
									pureFunctionsFromOption.has(name)
								) {
									markPure(name);
									return;
								}
								const init = path.field(0, Field.init, decl);
								if (init === 0) return;
								const initType = path.type(init);
								if (
									initType !== NodeType.FunctionExpression &&
									initType !== NodeType.ArrowFunctionExpression
								) {
									return;
								}

								let hasAnnotation = false;
								// Before the VariableDeclaration (only for const)
								if (path.textOf(Part.kind, statement) === "const") {
									hasAnnotation = hasNoSideEffectsNotation(
										parser,
										parser.getAttachedCommentsStart(
											parser.nodeOfPath(path, statement)
										),
										path.start(statement)
									);
								}

								if (!hasAnnotation) {
									hasAnnotation = hasNoSideEffectsNotation(
										parser,
										path.end(id),
										path.start(init)
									);
								}
								if (hasAnnotation) {
									markPure(name);
								}
							}
						);

						if (pureFunctionsFromOption) {
							parser.hooks.blockPreStatementByType
								.for("ExportDefaultDeclaration")
								.tap({ name: PLUGIN_NAME, path: true }, (path, statement) => {
									if (parser.scope.topLevelScope !== true) return;
									if (
										path.type(statement) ===
											NodeType.ExportDefaultDeclaration &&
										pureFunctionsFromOption.has("default")
									) {
										const type = path.type(
											path.field(0, Field.declaration, statement)
										);
										if (
											type === NodeType.ArrowFunctionExpression ||
											type === NodeType.FunctionExpression
										) {
											markPure("default");
										}
									}
								});
						}

						parser.hooks.isPure
							.for("CallExpression")
							.tap(
								{ name: PLUGIN_NAME, path: true },
								(path, expression, commentsStartPos) => {
									const callee = path.field(0, Field.callee, expression);
									if (path.type(callee) !== NodeType.Identifier) return;
									if (
										!parser.getTagData(path.name(callee), notSideEffectsTag)
									) {
										return;
									}
									let position = path.end(callee);
									const count = path.fieldCount(Field.arguments, expression);
									for (let i = 0; i < count; i++) {
										const arg = path.field(i, Field.arguments, expression);
										if (path.type(arg) === NodeType.SpreadElement) return false;
										if (
											!parser.isPure(parser.nodeOfPath(path, arg), position)
										) {
											return false;
										}
										position = path.end(arg);
									}
									return true;
								}
							);

						parser.hooks.finish.tap({ name: PLUGIN_NAME, path: true }, () => {
							if (pureFunctions === undefined || pureFunctions.size === 0) {
								return;
							}
							const buildInfo = parser.state.module.buildInfo;
							if (buildInfo.pureFunctions) {
								for (const fn of pureFunctions) {
									buildInfo.pureFunctions.add(fn);
								}
							} else {
								buildInfo.pureFunctions = pureFunctions;
							}
						});
					};

					for (const key of [
						JAVASCRIPT_MODULE_TYPE_AUTO,
						JAVASCRIPT_MODULE_TYPE_ESM,
						JAVASCRIPT_MODULE_TYPE_DYNAMIC
					]) {
						normalModuleFactory.hooks.parser
							.for(key)
							.tap(PLUGIN_NAME, (parser, parserOptions) => {
								applyNoSideEffectsNotationHandler(parser, parserOptions);
								applySideEffectsStmtHandler(parser, parserOptions);
							});
					}
				}
				compilation.hooks.optimizeDependencies.tap(
					{
						name: PLUGIN_NAME,
						stage: STAGE_DEFAULT
					},
					(modules) => {
						const logger = compilation.getLogger(
							"webpack.SideEffectsFlagPlugin"
						);

						logger.time("update dependencies");

						/** @type {Set<Module>} */
						const optimizedModules = new Set();

						// Only defer builds must protect deferred re-export barrels;
						// skip the per-target check entirely otherwise.
						const deferEnabled =
							compilation.options.experiments.deferImport === true;

						// Re-export resolution is idempotent within a pass, so cache it
						// per export info: a shared barrel imported by many modules
						// resolves each name once instead of once per consumer.
						/** @type {Map<InstanceType<ExportInfo>, TargetItemWithConnection | null>} */
						const reexportTargetCache = new Map();

						// Dependencies don't change within the pass, so the passthrough
						// check is cached per module across all moveTarget filter calls.
						/** @type {Map<Module, boolean>} */
						const singleStarReexportCache = new Map();

						/**
						 * Cached variant of moduleHasSingleStarReexport.
						 * @param {Module} module the candidate passthrough module
						 * @returns {boolean} true when the module is a pure single-star passthrough
						 */
						const hasSingleStarReexport = (module) => {
							let result = singleStarReexportCache.get(module);
							if (result === undefined) {
								result = moduleHasSingleStarReexport(module);
								singleStarReexportCache.set(module, result);
							}
							return result;
						};

						/**
						 * Optimize incoming connections.
						 * @param {Module} module module
						 */
						const optimizeIncomingConnections = (module) => {
							if (optimizedModules.has(module)) return;
							optimizedModules.add(module);
							if (module.getSideEffectsConnectionState(moduleGraph) === false) {
								const exportsInfo = moduleGraph.getExportsInfo(module);
								for (const connection of moduleGraph.getIncomingConnections(
									module
								)) {
									const dep = connection.dependency;
									/** @type {boolean} */
									let isReexport;
									if (
										(isReexport =
											dep !== null && isDependencyKind(dep, "esm-reexport")) ||
										(dep !== null &&
											isDependencyKind(dep, "esm-import-specifier") &&
											!dep.namespaceObjectAsContext)
									) {
										if (connection.originModule !== null) {
											optimizeIncomingConnections(connection.originModule);
										}

										if (isReexport) {
											if (!dep.name && !hasSingleStarReexport(module)) continue;

											const infos = dep.name
												? // Named re-exports resolve their single target here;
													// e.g. `export * as foo from "mod"` / `export { dep as name } from "mod"`
													[
														moduleGraph.getExportInfo(
															/** @type {Module} */ (connection.originModule),
															dep.name
														)
													]
												: moduleGraph.getExportsInfo(
														/** @type {Module} */ (connection.originModule)
													).exports;

											for (const exportInfo of infos) {
												const immediate = exportInfo.getTarget(
													moduleGraph,
													RETURNS_FALSE
												);
												if (
													immediate === undefined ||
													immediate.connection.dependency !== dep
												) {
													continue;
												}

												exportInfo.moveTarget(
													moduleGraph,
													(candidate) =>
														candidate.module.getSideEffectsConnectionState(
															moduleGraph
														) === false &&
														// Keep a deferred re-export's barrel (see below).
														(!deferEnabled ||
															!isDeferredTargetConnection(
																candidate.connection
															)) &&
														(Boolean(dep.name) ||
															hasSingleStarReexport(candidate.module)),
													({
														module: newModule,
														export: exportName,
														connection: targetConnection
													}) => {
														moduleGraph.updateModule(dep, newModule);
														moduleGraph.updateParent(
															dep,
															targetConnection,
															/** @type {Module} */ (connection.originModule)
														);
														moduleGraph.addExplanation(
															dep,
															"(skipped side-effect-free modules)"
														);
														const ids = dep.getIds(moduleGraph);
														if (ids.length) {
															dep.setIds(
																moduleGraph,
																exportName
																	? [...exportName, ...ids.slice(1)]
																	: ids.slice(1)
															);
														}
														return /** @type {ModuleGraphConnection} */ (
															moduleGraph.getConnection(dep)
														);
													}
												);
											}
											continue;
										}

										// Resolve the whole property chain here: the module a step
										// lands on may already be optimized, and would not revisit it.
										let ids = dep.getIds(moduleGraph);
										let currentExportsInfo = exportsInfo;
										// Ends: a namespace step drops an id, and a named step lands
										// on an export getTarget already followed to its end.
										while (ids.length > 0) {
											const exportInfo = currentExportsInfo.getExportInfo(
												ids[0]
											);
											let target = reexportTargetCache.get(exportInfo);
											if (target === undefined) {
												target =
													exportInfo.getTarget(
														moduleGraph,
														({ module }) =>
															module.getSideEffectsConnectionState(
																moduleGraph
															) === false
													) || null;
												reexportTargetCache.set(exportInfo, target);
											}
											if (!target) break;

											// A deferred re-export keeps its side-effect-free barrel:
											// collapsing it would turn the cached deferred namespace into
											// an eager import, losing both identity and semantics.
											if (
												deferEnabled &&
												isDeferredTargetConnection(target.connection)
											) {
												break;
											}

											moduleGraph.updateModule(dep, target.module);
											moduleGraph.updateParent(
												dep,
												target.connection,
												/** @type {Module} */ (connection.originModule)
											);
											moduleGraph.addExplanation(
												dep,
												"(skipped side-effect-free modules)"
											);
											ids = target.export
												? [...target.export, ...ids.slice(1)]
												: ids.slice(1);
											dep.setIds(moduleGraph, ids);
											if (
												target.module.getSideEffectsConnectionState(
													moduleGraph
												) !== false
											) {
												break;
											}
											currentExportsInfo = moduleGraph.getExportsInfo(
												target.module
											);
										}
									}
								}
							}
						};

						for (const module of modules) {
							optimizeIncomingConnections(module);
						}
						moduleGraph.finishUpdateParent();
						logger.timeEnd("update dependencies");
					}
				);
			}
		);
	}

	/**
	 * Module has side effects.
	 * @param {string} moduleName the module name
	 * @param {SideEffectsFlagValue} flagValue the flag value
	 * @param {CacheItem} cache cache for glob to regexp
	 * @returns {boolean | undefined} true, when the module has side effects, undefined or false when not
	 */
	static moduleHasSideEffects(moduleName, flagValue, cache) {
		switch (typeof flagValue) {
			case "boolean":
				return flagValue;
			case "string":
				return globToRegexp(flagValue, cache).test(moduleName);
		}
		if (!Array.isArray(flagValue)) return true;
		return flagValue.some(
			(glob) =>
				typeof glob !== "string" || globToRegexp(glob, cache).test(moduleName)
		);
	}
}

module.exports = SideEffectsFlagPlugin;
