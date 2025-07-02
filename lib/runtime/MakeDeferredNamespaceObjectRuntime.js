/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/**
 * @param {import("../Module").ExportsType} exportsType exports type
 * @returns {string} mode
 */
function getMakeDeferredNamespaceModeFromExportsType(exportsType) {
	if (exportsType === "namespace") return `/* ${exportsType} */ 0`;
	if (exportsType === "default-only") return `/* ${exportsType} */ 1`;
	if (exportsType === "default-with-named") return `/* ${exportsType} */ 2`;
	if (exportsType === "dynamic") return `/* ${exportsType} */ 3`;
	return "";
}
/**
 * @param {import("../ModuleTemplate").RuntimeTemplate} _runtimeTemplate runtimeTemplate
 * @param {import("../Module").ExportsType} exportsType exportsType
 * @param {string} moduleId moduleId
 * @param {(import("../ChunkGraph").ModuleId | null)[]} asyncDepsIds asyncDepsIds
 * @returns {string} function
 */
function getOptimizedDeferredModule(
	_runtimeTemplate,
	exportsType,
	moduleId,
	asyncDepsIds
) {
	const isAsync = asyncDepsIds && asyncDepsIds.length;
	const init = `${RuntimeGlobals.require}(${moduleId})${
		isAsync ? `[${RuntimeGlobals.asyncModuleExportSymbol}]` : ""
	}`;
	const props = [
		`/* ${exportsType} */ get a() {`,
		// if exportsType is "namespace" we can generate the most optimized code,
		// on the second access, we can avoid trigger the getter.
		// we can also do this if exportsType is "dynamic" and there is a "__esModule" property on it.
		exportsType === "namespace" || exportsType === "dynamic"
			? Template.indent([
					`var exports = ${init};`,
					`${
						exportsType === "dynamic" ? "if (exports.__esModule) " : ""
					}Object.defineProperty(this, "a", { value: exports });`,
					"return exports;"
				])
			: Template.indent([`return ${init};`]),
		isAsync ? "}," : "}",
		isAsync
			? `[${
					RuntimeGlobals.makeDeferredNamespaceObjectSymbol
				}]: ${JSON.stringify(asyncDepsIds.filter(x => x !== null))}`
			: ""
	];
	return Template.asString(["{", Template.indent(props), "}"]);
}

const strictModuleCache = [
	"if (cachedModule && cachedModule.error === undefined) {",
	Template.indent([
		"var exports = cachedModule.exports;",
		"if (mode == 0) return exports;",
		`if (mode == 1) return ${RuntimeGlobals.createFakeNamespaceObject}(exports);`,
		`if (mode == 2) return ${RuntimeGlobals.createFakeNamespaceObject}(exports, 2);`,
		`if (mode == 3) return ${RuntimeGlobals.createFakeNamespaceObject}(exports, 6);` // 2 | 4
	]),
	"}"
];
const nonStrictModuleCache = [
	"// optimization not applied when output.strictModuleErrorHandling is off"
];

class MakeDeferredNamespaceObjectRuntimeModule extends HelperRuntimeModule {
	/**
	 * @param {boolean} hasAsyncRuntime if async module is used.
	 */
	constructor(hasAsyncRuntime) {
		super("make deferred namespace object");
		this.hasAsyncRuntime = hasAsyncRuntime;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		if (!this.compilation) return null;
		const { runtimeTemplate } = this.compilation;
		const fn = RuntimeGlobals.makeDeferredNamespaceObject;
		const hasAsync = this.hasAsyncRuntime;
		const strictError =
			this.compilation.options.output.strictModuleErrorHandling;
		const init = runtimeTemplate.supportsOptionalChaining()
			? "init?.();"
			: "if (init) init();";
		return `${fn} = ${runtimeTemplate.basicFunction("moduleId, mode", [
			"// mode: 0 => namespace (esm)",
			"// mode: 1 => default-only (esm strict cjs)",
			"// mode: 2 => default-with-named (esm-cjs compat)",
			"// mode: 3 => dynamic (if exports has __esModule, then esm, otherwise default-with-named)",
			"",
			"var cachedModule = __webpack_module_cache__[moduleId];",
			...(strictError ? strictModuleCache : nonStrictModuleCache),
			"",
			`var init = ${runtimeTemplate.basicFunction("", [
				`ns = ${RuntimeGlobals.require}(moduleId);`,
				hasAsync
					? `if (${RuntimeGlobals.asyncModuleExportSymbol} in ns) ns = ns[${RuntimeGlobals.asyncModuleExportSymbol}];`
					: "",
				"init = null;",
				"if (mode == 0 || mode == 3 && ns.__esModule && typeof ns === 'object') {",
				Template.indent([
					"delete handler.defineProperty;",
					"delete handler.deleteProperty;",
					"delete handler.set;",
					"delete handler.get;",
					"delete handler.has;",
					"delete handler.ownKeys;",
					"delete handler.getOwnPropertyDescriptor;"
				]),
				"} else if (mode == 1) {",
				Template.indent([
					`ns = ${RuntimeGlobals.createFakeNamespaceObject}(ns);`
				]),
				"} else if (mode == 2) {",
				Template.indent([
					`ns = ${RuntimeGlobals.createFakeNamespaceObject}(ns, 2);`
				]),
				"} else if (mode == 3) {",
				Template.indent([
					`ns = ${RuntimeGlobals.createFakeNamespaceObject}(ns, 6);`
				]),
				"}"
			])};`,
			"",
			`var ns = ${
				strictError ? "" : "cachedModule && cachedModule.exports || "
			}__webpack_module_deferred_exports__[moduleId] || (__webpack_module_deferred_exports__[moduleId] = { __proto__: null });`,
			"var handler = {",
			Template.indent([
				"__proto__: null,",
				`get: ${runtimeTemplate.basicFunction("_, name", [
					"switch (name) {",
					Template.indent([
						'case "__esModule": return true;',
						'case Symbol.toStringTag: return "Deferred Module";',
						'case "then": return undefined;'
					]),
					"}",
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
								? `case ${RuntimeGlobals.makeDeferredNamespaceObjectSymbol}:`
								: "",
							Template.indent("return true;"),
							'case "then":',
							Template.indent("return false;")
						].filter(Boolean)
					),
					"}",
					init,
					"return name in ns;"
				])},`,
				`ownKeys: ${runtimeTemplate.basicFunction("", [
					init,
					`var keys = Reflect.ownKeys(ns).filter(${runtimeTemplate.expressionFunction('x !== "then"', "x")}).concat([Symbol.toStringTag]);`,
					"return keys;"
				])},`,
				`getOwnPropertyDescriptor: ${runtimeTemplate.basicFunction("_, name", [
					"switch (name) {",
					Template.indent([
						'case "__esModule": return { value: true, configurable: !!mode };',
						'case Symbol.toStringTag: return { value: "Deferred Module", configurable: !!mode };',
						'case "then": return undefined;'
					]),
					"}",
					init,
					"var desc = Reflect.getOwnPropertyDescriptor(ns, name);",
					'if (mode == 2 && name == "default" && !desc) {',
					Template.indent("desc = { value: ns, configurable: true };"),
					"}",
					"return desc;"
				])},`,
				`defineProperty: ${runtimeTemplate.basicFunction("_, name", [
					init,
					// Note: This behavior does not match the spec one, but since webpack does not do it either
					// for a normal Module Namespace object (in MakeNamespaceObjectRuntimeModule), let's keep it simple.
					"return false;"
				])},`,
				`deleteProperty: ${runtimeTemplate.returningFunction("false")},`,
				`set: ${runtimeTemplate.returningFunction("false")},`
			]),
			"}",
			// we don't fully emulate ES Module semantics in this Proxy to align with normal webpack esm namespace object.
			"return new Proxy(ns, handler);"
		])};`;
	}
}

module.exports = MakeDeferredNamespaceObjectRuntimeModule;
module.exports.getMakeDeferredNamespaceModeFromExportsType =
	getMakeDeferredNamespaceModeFromExportsType;
module.exports.getOptimizedDeferredModule = getOptimizedDeferredModule;
