/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../Module").ExportsType} ExportsType */
/** @typedef {import("../ChunkGraph").ModuleId} ModuleId */

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
 * @param {RuntimeRequirements} runtimeRequirements runtime requirements
 * @returns {string} call make optimized deferred namespace object
 */
function getOptimizedDeferredModule(
	moduleId,
	exportsType,
	asyncDepsIds,
	runtimeRequirements
) {
	runtimeRequirements.add(RuntimeGlobals.makeOptimizedDeferredNamespaceObject);
	const mode = getMakeDeferredNamespaceModeFromExportsType(exportsType);
	return `${RuntimeGlobals.makeOptimizedDeferredNamespaceObject}(${moduleId}, ${mode}${
		asyncDepsIds.length > 0
			? `, ${JSON.stringify(asyncDepsIds.filter((x) => x !== null))}`
			: ""
	})`;
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
		const fn = RuntimeGlobals.makeOptimizedDeferredNamespaceObject;
		const hasAsync = this.hasAsyncRuntime;
		return Template.asString([
			// Note: must be a function (not arrow), because this is used in body!
			`${fn} = function(moduleId, mode${hasAsync ? ", asyncDeps" : ""}) {`,
			Template.indent([
				"var r = this;",
				hasAsync ? "var isAsync = asyncDeps && asyncDeps.length;" : "",
				"var obj = {",
				Template.indent([
					"get a() {",
					Template.indent([
						"var exports = r(moduleId);",
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
		const fn = RuntimeGlobals.makeDeferredNamespaceObject;
		const hasAsync = this.hasAsyncRuntime;
		const init = runtimeTemplate.supportsOptionalChaining()
			? "init?.();"
			: "if (init) init();";
		return `${fn} = ${runtimeTemplate.basicFunction("moduleId, mode", [
			"var cachedModule = __webpack_module_cache__[moduleId];",
			"if (cachedModule && cachedModule.error === undefined) {",
			Template.indent([
				"var exports = cachedModule.exports;",
				hasAsync
					? `if (${RuntimeGlobals.asyncModuleExportSymbol} in exports) exports = exports[${RuntimeGlobals.asyncModuleExportSymbol}];`
					: "",
				"if (mode & 8) return exports;",
				`return ${RuntimeGlobals.createFakeNamespaceObject}(exports, mode);`
			]),
			"}",
			"",
			`var init = ${runtimeTemplate.basicFunction("", [
				`ns = ${RuntimeGlobals.require}(moduleId);`,
				hasAsync
					? `if (${RuntimeGlobals.asyncModuleExportSymbol} in ns) ns = ns[${RuntimeGlobals.asyncModuleExportSymbol}];`
					: "",
				"init = null;",
				"if (mode & 8 || mode & 4 && ns.__esModule && typeof ns === 'object') {",
				Template.indent([
					"delete handler.defineProperty;",
					"delete handler.deleteProperty;",
					"delete handler.set;",
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
				"var keys = Reflect.ownKeys(ns);",
				"for (var i = 0; i < keys.length; i++) {",
				Template.indent([
					"var k = keys[i];",
					'if (k === "__esModule" || k === Symbol.toStringTag) continue;',
					"if (!Object.prototype.hasOwnProperty.call(ns_target, k)) {",
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
			"var ns_target = { __proto__: null };",
			// Pre-populate the synthetic deferred-namespace properties with
			// fully non-configurable, non-writable, non-enumerable descriptors
			// (matching the TC39 import-defer spec for Module Namespace
			// Exotic Objects). The trap returns the same descriptors below.
			'Object.defineProperty(ns_target, "__esModule", { value: true });',
			'Object.defineProperty(ns_target, Symbol.toStringTag, { value: "Deferred Module" });',
			"var ns = ns_target;",
			"var handler = {",
			Template.indent([
				"__proto__: null,",
				// Per the TC39 import-defer proposal, `IsSymbolLikeNamespaceKey`
				// returns true for any Symbol-keyed access (and for "then"); such
				// accesses go through `OrdinaryGetOwnProperty` and must not
				// trigger evaluation of the deferred module. The Symbol checks
				// below short-circuit to the pre-populated target without
				// running `init()`.
				`get: ${runtimeTemplate.basicFunction("_, name", [
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
				`has: ${runtimeTemplate.basicFunction("_, name", [
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
				`ownKeys: ${runtimeTemplate.basicFunction("", [
					init,
					`var keys = Reflect.ownKeys(ns).filter(${runtimeTemplate.expressionFunction('x !== "then" && x !== Symbol.toStringTag', "x")}).concat([Symbol.toStringTag]);`,
					"return keys;"
				])},`,
				`getOwnPropertyDescriptor: ${runtimeTemplate.basicFunction("_, name", [
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
					"var desc = Reflect.getOwnPropertyDescriptor(ns, name);",
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
				`defineProperty: ${runtimeTemplate.basicFunction("_, name", [
					'if (typeof name === "symbol" || name === "then") return false;',
					init,
					"return false;"
				])},`,
				// `deleteProperty` rejects, but per the TC39 spec it must
				// still trigger evaluation for string keys (the spec
				// algorithm calls `GetModuleExportsList` for non-symbol-like
				// keys, forcing evaluation on a deferred namespace).
				`deleteProperty: ${runtimeTemplate.basicFunction("_, name", [
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
			"return new Proxy(ns_target, handler);"
		])};`;
	}
}

module.exports.MakeDeferredNamespaceObjectRuntimeModule =
	MakeDeferredNamespaceObjectRuntimeModule;
module.exports.MakeOptimizedDeferredNamespaceObjectRuntimeModule =
	MakeOptimizedDeferredNamespaceObjectRuntimeModule;
module.exports.getMakeDeferredNamespaceModeFromExportsType =
	getMakeDeferredNamespaceModeFromExportsType;
module.exports.getOptimizedDeferredModule = getOptimizedDeferredModule;
