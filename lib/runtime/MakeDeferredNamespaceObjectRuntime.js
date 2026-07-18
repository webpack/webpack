/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../Module").ExportsType} ExportsType */
/** @typedef {import("../ChunkGraph").ModuleId} ModuleId */

/**
 * @typedef {object} DeferredCycleState
 * @property {Map<Module, Set<Module>>} sccOf strongly-connected component per module (shared object per component)
 * @property {Map<Module, Set<Module> | null>} peers memoized SCC peers (component minus the module) per deferred module
 */

/** @type {WeakMap<ModuleGraph, DeferredCycleState>} */
const deferredCycleCache = new WeakMap();

/**
 * Materializes the active harmony-import targets of a module (deferred edges
 * included, matching the spec's `RequestedModules` recursion).
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the module
 * @returns {Module[]} imported modules
 */
function harmonyImportTargets(moduleGraph, module) {
	const connections = moduleGraph.getOutgoingConnectionsByModule(module);
	if (!connections) return [];
	/** @type {Module[]} */
	const targets = [];
	for (const [dep, moduleConnections] of connections) {
		if (
			dep &&
			moduleConnections.some(
				(c) =>
					c.dependency instanceof HarmonyImportDependency &&
					c.isTargetActive(undefined)
			)
		) {
			targets.push(dep);
		}
	}
	return targets;
}

/**
 * Assigns every module reachable from `seed` (through active harmony imports)
 * to its strongly-connected component via an iterative Tarjan pass, writing the
 * results into `sccOf`. Modules already assigned by an earlier pass are treated
 * as finished, so across all deferred imports every edge is visited once
 * (O(V + E) total) rather than re-walked per import.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} seed the module to explore from
 * @param {Map<Module, Set<Module>>} sccOf module-to-component map to populate
 * @returns {void}
 */
function assignStronglyConnectedComponents(moduleGraph, seed, sccOf) {
	if (sccOf.has(seed)) return;
	/** @type {Map<Module, number>} */
	const index = new Map();
	/** @type {Map<Module, number>} */
	const low = new Map();
	/** @type {Set<Module>} */
	const onStack = new Set();
	/** @type {Module[]} */
	const componentStack = [];
	/** @type {{ node: Module, targets: Module[], i: number }[]} */
	const work = [];
	let counter = 0;
	/**
	 * @param {Module} node node to open
	 */
	const open = (node) => {
		index.set(node, counter);
		low.set(node, counter);
		counter++;
		componentStack.push(node);
		onStack.add(node);
		work.push({ node, targets: harmonyImportTargets(moduleGraph, node), i: 0 });
	};
	open(seed);
	while (work.length > 0) {
		const frame = work[work.length - 1];
		if (frame.i < frame.targets.length) {
			const next = frame.targets[frame.i++];
			// Already in a finished component (from this or a prior pass): skip.
			if (sccOf.has(next)) continue;
			if (!index.has(next)) {
				open(next);
			} else if (onStack.has(next)) {
				const nodeLow = /** @type {number} */ (low.get(frame.node));
				const nextIndex = /** @type {number} */ (index.get(next));
				if (nextIndex < nodeLow) low.set(frame.node, nextIndex);
			}
			continue;
		}
		work.pop();
		const node = frame.node;
		const nodeLow = /** @type {number} */ (low.get(node));
		if (work.length > 0) {
			const parent = work[work.length - 1].node;
			if (nodeLow < /** @type {number} */ (low.get(parent))) {
				low.set(parent, nodeLow);
			}
		}
		if (nodeLow === index.get(node)) {
			/** @type {Set<Module>} */
			const component = new Set();
			let member;
			do {
				member = /** @type {Module} */ (componentStack.pop());
				onStack.delete(member);
				component.add(member);
			} while (member !== node);
			for (const m of component) sccOf.set(m, component);
		}
	}
}

/**
 * Per the TC39 import-defer spec's `ReadyForSyncExecution`, forcing evaluation
 * of a deferred module must throw when any module in its transitive static
 * import closure is currently evaluating. Only a module in `module`'s own
 * strongly-connected component can be evaluating at that point (anything else it
 * imports is either already evaluated or not started), so we emit just the SCC
 * peers instead of the whole (potentially huge) forward closure.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the deferred module
 * @returns {Set<Module> | null} the SCC peers when cyclic, otherwise null
 */
function getDeferredCycleModules(moduleGraph, module) {
	let state = deferredCycleCache.get(moduleGraph);
	if (state === undefined) {
		state = { sccOf: new Map(), peers: new Map() };
		deferredCycleCache.set(moduleGraph, state);
	}
	const cached = state.peers.get(module);
	if (cached !== undefined) return cached;
	assignStronglyConnectedComponents(moduleGraph, module, state.sccOf);
	const component = state.sccOf.get(module);
	// A trivial component (size 1, no self-cycle peers) means no cycle; a direct
	// self-loop is already covered by the `evaluating` check on `module` itself.
	let result = null;
	if (component !== undefined && component.size > 1) {
		result = new Set(component);
		result.delete(module);
	}
	state.peers.set(module, result);
	return result;
}

/**
 * Maps a defer-cycle closure to the runtime module ids whose `evaluating` flag
 * the deferred namespace must check. `resolveId` maps a closure module to the
 * runtime id that carries its evaluation state (its own id, or the id of the
 * concatenated module that absorbed it); unresolved (`null`) members are
 * dropped. Returns `null` when there is nothing to check.
 * @param {Set<Module> | null} closure closure modules, or null when not cyclic
 * @param {(module: Module) => ModuleId | null} resolveId maps a module to its runtime id
 * @returns {ModuleId[] | null} deduplicated runtime ids, or null
 */
function getDeferredCycleModuleIds(closure, resolveId) {
	if (closure === null) return null;
	/** @type {Set<ModuleId>} */
	const ids = new Set();
	for (const module of closure) {
		const id = resolveId(module);
		if (id !== null) ids.add(id);
	}
	return ids.size > 0 ? [...ids] : null;
}

/**
 * @param {ExportsType} exportsType exports type
 * @returns {string} mode
 */
function getMakeDeferredNamespaceModeFromExportsType(exportsType) {
	// number is from createFakeNamespaceObject mode ^ 1
	if (exportsType === "namespace") return `/* ${exportsType} */ 8`;
	if (exportsType === "default-only") return `/* ${exportsType} */ 0`;
	if (exportsType === "default-with-named") return `/* ${exportsType} */ 2`;
	if (exportsType === "dynamic") return `/* ${exportsType} */ 6`;
	throw new Error(`Unknown exports type: ${exportsType}`);
}

/**
 * @param {string} moduleId moduleId
 * @param {ExportsType} exportsType exportsType
 * @param {(ModuleId | null)[]} asyncDepsIds asyncDepsIds
 * @param {ModuleId[] | null} syncCycleDepsIds transitive static closure ids when the module is part of a defer cycle
 * @param {RuntimeRequirements} runtimeRequirements runtime requirements
 * @returns {string} call make optimized deferred namespace object
 */
function getOptimizedDeferredModule(
	moduleId,
	exportsType,
	asyncDepsIds,
	syncCycleDepsIds,
	runtimeRequirements
) {
	runtimeRequirements.add(RuntimeGlobals.makeOptimizedDeferredNamespaceObject);
	const mode = getMakeDeferredNamespaceModeFromExportsType(exportsType);
	const asyncDeps = asyncDepsIds.filter((x) => x !== null);
	const hasSync = syncCycleDepsIds !== null && syncCycleDepsIds.length > 0;
	// `syncDeps` is passed positionally after `asyncDeps`, so a `0` placeholder
	// keeps the slot when the module has cycle deps but no async deps.
	const args = [moduleId, mode];
	if (asyncDeps.length > 0 || hasSync) {
		args.push(asyncDeps.length > 0 ? JSON.stringify(asyncDeps) : "0");
	}
	if (hasSync) args.push(JSON.stringify(syncCycleDepsIds));
	return `${RuntimeGlobals.makeOptimizedDeferredNamespaceObject}(${args.join(
		", "
	)})`;
}

class MakeOptimizedDeferredNamespaceObjectRuntimeModule extends HelperRuntimeModule {
	/**
	 * @param {boolean} hasAsyncRuntime if async module is used.
	 */
	constructor(hasAsyncRuntime) {
		super("make optimized deferred namespace object");
		/** @type {boolean} */
		this.hasAsyncRuntime = hasAsyncRuntime;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		if (!this.compilation) return null;
		const { runtimeTemplate } = this.compilation;
		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		const fn = RuntimeGlobals.makeOptimizedDeferredNamespaceObject;
		const hasAsync = this.hasAsyncRuntime;
		return Template.asString([
			// Note: must be a function (not arrow), because this is used in body!
			// `asyncDeps` keeps a fixed positional slot even without async runtime
			// so the trailing `syncDeps` (defer-cycle closure) always lines up.
			`${fn} = function(moduleId, mode, asyncDeps, syncDeps) {`,
			Template.indent([
				`${cst} r = this;`,
				hasAsync ? `${cst} isAsync = asyncDeps && asyncDeps.length;` : "",
				`${cst} obj = {`,
				Template.indent([
					"get a() {",
					Template.indent([
						// Forcing evaluation of a module that is currently evaluating
						// (a cycle reached through a deferred import) must throw rather
						// than expose its partial exports. `syncDeps` (present only for
						// cyclic deferred modules) carries the transitive static closure,
						// so an evaluating dependency is caught before any evaluation.
						`${cst} cachedModule = __webpack_module_cache__[moduleId];`,
						'if (cachedModule !== undefined && (cachedModule.evaluating || cachedModule.evaluatingAsync)) throw new TypeError("Cannot access a deferred module namespace while the module is being evaluated");',
						"if (syncDeps) for (var i = 0; i < syncDeps.length; i++) {",
						Template.indent([
							`${cst} depModule = __webpack_module_cache__[syncDeps[i]];`,
							'if (depModule !== undefined && (depModule.evaluating || depModule.evaluatingAsync)) throw new TypeError("Cannot access a deferred module namespace while a dependency is being evaluated");'
						]),
						"}",
						`${lt} exports = r(moduleId);`,
						hasAsync
							? `if(isAsync) exports = exports[${RuntimeGlobals.asyncModuleExportSymbol}];`
							: "",
						// if exportsType is "namespace" we can generate the most optimized code,
						// on the second access, we can avoid trigger the getter.
						// we can also do this if exportsType is "dynamic" and there is a "__esModule" property on it.
						'if(mode & 8 || (mode & 4 && exports.__esModule)) Object.defineProperty(this, "a", { value: exports });',
						"return exports;"
					]),
					"}"
				]),
				"};",
				hasAsync
					? `if(isAsync) obj[${RuntimeGlobals.deferredModuleAsyncTransitiveDependenciesSymbol}] = asyncDeps;`
					: "",
				"return obj;"
			]),
			"};"
		]);
	}
}

class MakeDeferredNamespaceObjectRuntimeModule extends HelperRuntimeModule {
	/**
	 * @param {boolean} hasAsyncRuntime if async module is used.
	 */
	constructor(hasAsyncRuntime) {
		super("make deferred namespace object");
		/** @type {boolean} */
		this.hasAsyncRuntime = hasAsyncRuntime;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		if (!this.compilation) return null;
		const { runtimeTemplate } = this.compilation;
		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		const fn = RuntimeGlobals.makeDeferredNamespaceObject;
		const hasAsync = this.hasAsyncRuntime;
		const init = `${runtimeTemplate.optionalChaining("init", "()")};`;
		return `${fn} = ${runtimeTemplate.basicFunction("moduleId, mode", [
			// Per the TC39 import-defer spec, deferred namespaces are
			// distinct from their eager counterparts and the same module
			// referenced from multiple defer-import sites must yield the
			// same object. Cache the Proxy / fake namespace per-moduleId so
			// repeated calls (including across files) share identity.
			//
			// Bit 16 (`createFakeNamespaceObject`'s "return value when
			// it's Promise-like" flag added by
			// `RuntimeTemplate.moduleNamespacePromise` for dynamic
			// imports) is irrelevant for deferred namespaces — the value
			// passed into `createFakeNamespaceObject` here is always the
			// resolved module exports (after unwrapping the async-module
			// export symbol when present), never a Promise. Strip it
			// once so all downstream behavior, the cache key, and the
			// `createFakeNamespaceObject` call below see the same shape
			// mode. This keeps static defer (mode 8) and dynamic
			// `await import.defer` (mode 8 | 16) sharing the same
			// Deferred Module Namespace object, while still keying by
			// `(moduleId, mode)` so distinct exports-type shapes
			// (e.g. one importer treats a CJS module as
			// "default-with-named", another as "namespace") get
			// distinct cache entries.
			"mode &= ~16;",
			`${lt} byMode = __webpack_module_deferred_namespace_cache__[moduleId];`,
			"if (byMode && byMode[mode] !== undefined) return byMode[mode];",
			"if (!byMode) byMode = __webpack_module_deferred_namespace_cache__[moduleId] = {};",
			`${cst} cachedModule = __webpack_module_cache__[moduleId];`,
			"if (cachedModule && cachedModule.error === undefined && !(mode & 8)) {",
			Template.indent([
				`${lt} exports = cachedModule.exports;`,
				hasAsync
					? `if (${RuntimeGlobals.asyncModuleExportSymbol} in exports) exports = exports[${RuntimeGlobals.asyncModuleExportSymbol}];`
					: "",
				`return byMode[mode] = ${RuntimeGlobals.createFakeNamespaceObject}(exports, mode);`
			]),
			"}",
			"",
			`${lt} init = ${runtimeTemplate.basicFunction("", [
				// A deferred namespace that forces evaluation of a module that is
				// already evaluating (a cycle) must throw rather than expose its
				// partial exports.
				`${cst} evaluatingModule = __webpack_module_cache__[moduleId];`,
				'if (evaluatingModule !== undefined && (evaluatingModule.evaluating || evaluatingModule.evaluatingAsync)) throw new TypeError("Cannot access a deferred module namespace while the module is being evaluated");',
				`ns = ${RuntimeGlobals.require}(moduleId);`,
				hasAsync
					? `if (${RuntimeGlobals.asyncModuleExportSymbol} in ns) ns = ns[${RuntimeGlobals.asyncModuleExportSymbol}];`
					: "",
				"init = null;",
				"if (mode & 8 || mode & 4 && ns.__esModule && typeof ns === 'object') {",
				Template.indent([
					// Drop only the read-side traps after init: with the
					// resolved namespace's own keys mirrored onto
					// `ns_target` below, the default `Reflect` behavior
					// returns the right values via the live-binding
					// getters, so we no longer need to intercept `get` /
					// `has` / `ownKeys` / `getOwnPropertyDescriptor`.
					//
					// The mutation traps (`set`, `deleteProperty`,
					// `defineProperty`) are kept because per the TC39
					// import-defer spec, `[[Set]]` / `[[Delete]]` /
					// `[[DefineOwnProperty]]` on a Deferred Module
					// Namespace Exotic Object never succeed — and the
					// proxy target itself remains extensible
					// (architecturally we cannot freeze it up-front),
					// so without these traps `ns.notExported = "x"`
					// after evaluation would silently create a property
					// on the target instead of returning false.
					"delete handler.get;",
					"delete handler.has;",
					"delete handler.ownKeys;",
					"delete handler.getOwnPropertyDescriptor;"
				]),
				"} else {",
				Template.indent([
					`ns = ${RuntimeGlobals.createFakeNamespaceObject}(ns, mode);`
				]),
				"}",
				// Mirror own properties from the resolved namespace onto the proxy
				// target so that proxy invariants hold for callers that structurally
				// introspect via `Object.keys` / `Object.getOwnPropertyNames` /
				// `Object.getOwnPropertyDescriptor`: when our trap reports a
				// non-configurable descriptor for a key, the target must also have
				// that key with a matching descriptor.
				//
				// `__esModule` and `Symbol.toStringTag` are intentionally skipped:
				// the proxy synthesizes "Deferred Module" / true regardless of what
				// the underlying namespace exposes (per the TC39 import-defer
				// proposal, the [[StringTag]] of a Deferred Module Namespace
				// Exotic Object is "Deferred Module"), and the target was already
				// pre-populated with those values below.
				`${cst} keys = Reflect.ownKeys(ns);`,
				"for (var i = 0; i < keys.length; i++) {",
				Template.indent([
					`${cst} k = keys[i];`,
					'if (k === "__esModule" || k === Symbol.toStringTag) continue;',
					`if (!${runtimeTemplate.objectHasOwn("ns_target", "k")}) {`,
					Template.indent([
						"try { Object.defineProperty(ns_target, k, Reflect.getOwnPropertyDescriptor(ns, k)); } catch (_) {}"
					]),
					"}"
				]),
				"}"
			])};`,
			"",
			// The proxy target is a fresh placeholder, separate from
			// `__webpack_module_deferred_exports__[moduleId]` (which is reused
			// by `__webpack_require__` as `module.exports` for deferred-loaded
			// modules and would conflict with our pre-populated synthetic
			// `__esModule` / `Symbol.toStringTag` non-configurable properties).
			// Using a dedicated target keeps the proxy invariant-compliant
			// without interfering with the module's own exports object.
			`${cst} ns_target = { __proto__: null };`,
			// Pre-populate the synthetic deferred-namespace properties with
			// fully non-configurable, non-writable, non-enumerable descriptors
			// (matching the TC39 import-defer spec for Module Namespace
			// Exotic Objects). The trap returns the same descriptors below.
			'Object.defineProperty(ns_target, "__esModule", { value: true });',
			'Object.defineProperty(ns_target, Symbol.toStringTag, { value: "Deferred Module" });',
			`${lt} ns = ns_target;`,
			`${cst} handler = {`,
			Template.indent([
				"__proto__: null,",
				// Per the TC39 import-defer proposal, `IsSymbolLikeNamespaceKey`
				// returns true for any Symbol-keyed access (and for "then"); such
				// accesses go through `OrdinaryGetOwnProperty` and must not
				// trigger evaluation of the deferred module. The Symbol checks
				// below short-circuit to the pre-populated target without
				// running `init()`.
				`${runtimeTemplate.method("get", "_, name", [
					"switch (name) {",
					Template.indent([
						'case "__esModule": return true;',
						'case Symbol.toStringTag: return "Deferred Module";',
						'case "then": return undefined;'
					]),
					"}",
					'if (typeof name === "symbol") return ns_target[name];',
					init,
					"return ns[name];"
				])},`,
				`${runtimeTemplate.method("has", "_, name", [
					"switch (name) {",
					Template.indent(
						[
							'case "__esModule":',
							"case Symbol.toStringTag:",
							hasAsync
								? `case ${RuntimeGlobals.deferredModuleAsyncTransitiveDependenciesSymbol}:`
								: "",
							Template.indent("return true;"),
							'case "then":',
							Template.indent("return false;")
						].filter(Boolean)
					),
					"}",
					'if (typeof name === "symbol") return name in ns_target;',
					init,
					"return name in ns;"
				])},`,
				`${runtimeTemplate.method("ownKeys", "", [
					init,
					`${cst} filtered = Reflect.ownKeys(ns).filter(${runtimeTemplate.expressionFunction(
						'x !== "then" && x !== Symbol.toStringTag',
						"x"
					)});`,
					`${cst} keys = ${
						runtimeTemplate.supportsSpread()
							? "[...filtered, Symbol.toStringTag]"
							: "filtered.concat([Symbol.toStringTag])"
					};`,
					"return keys;"
				])},`,
				`${runtimeTemplate.method("getOwnPropertyDescriptor", "_, name", [
					"switch (name) {",
					Template.indent([
						// Match the descriptors actually defined on `ns_target`
						// (non-configurable, non-writable, non-enumerable) so the
						// proxy invariant holds for both the trap result and any
						// post-init forwarding via the deleted-handler path.
						'case "__esModule": return { value: true, writable: false, enumerable: false, configurable: false };',
						'case Symbol.toStringTag: return { value: "Deferred Module", writable: false, enumerable: false, configurable: false };',
						'case "then": return undefined;'
					]),
					"}",
					'if (typeof name === "symbol") return Reflect.getOwnPropertyDescriptor(ns_target, name);',
					init,
					`${lt} desc = Reflect.getOwnPropertyDescriptor(ns, name);`,
					'if (mode & 2 && name == "default" && !desc) {',
					Template.indent("desc = { value: ns, configurable: true };"),
					"}",
					"return desc;"
				])},`,
				// `defineProperty` always rejects, but per the TC39 spec it
				// must still trigger evaluation for string keys (the spec
				// algorithm calls `[[GetOwnProperty]]` first, which forces
				// evaluation on a deferred namespace). Symbol keys go through
				// OrdinaryDefineOwnProperty and do not trigger eval.
				`${runtimeTemplate.method("defineProperty", "_, name", [
					'if (typeof name === "symbol" || name === "then") return false;',
					init,
					"return false;"
				])},`,
				// `deleteProperty` rejects, but per the TC39 spec it must
				// still trigger evaluation for string keys (the spec
				// algorithm calls `GetModuleExportsList` for non-symbol-like
				// keys, forcing evaluation on a deferred namespace).
				`${runtimeTemplate.method("deleteProperty", "_, name", [
					'if (typeof name === "symbol" || name === "then") return false;',
					init,
					"return false;"
				])},`,
				// `set` always returns false without triggering evaluation —
				// the spec [[Set]] algorithm for Module Namespaces is just
				// "return false" (no [[GetOwnProperty]], no eval).
				`set: ${runtimeTemplate.returningFunction("false")},`
			]),
			"}",
			// we don't fully emulate ES Module semantics in this Proxy to align with normal webpack esm namespace object.
			"return byMode[mode] = new Proxy(ns_target, handler);"
		])};`;
	}
}

module.exports.MakeDeferredNamespaceObjectRuntimeModule =
	MakeDeferredNamespaceObjectRuntimeModule;
module.exports.MakeOptimizedDeferredNamespaceObjectRuntimeModule =
	MakeOptimizedDeferredNamespaceObjectRuntimeModule;
module.exports.getDeferredCycleModuleIds = getDeferredCycleModuleIds;
module.exports.getDeferredCycleModules = getDeferredCycleModules;
module.exports.getMakeDeferredNamespaceModeFromExportsType =
	getMakeDeferredNamespaceModeFromExportsType;
module.exports.getOptimizedDeferredModule = getOptimizedDeferredModule;
