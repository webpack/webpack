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
}
/**
 * @param {import("../ModuleTemplate").RuntimeTemplate} _runtimeTemplate runtimeTemplate
 * @param {import("../Module").ExportsType} exportsType exportsType
 * @param {string} moduleId moduleId
 * @param {(string | number)[]} asyncDepsIds asyncDepsIds
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
				}]: ${JSON.stringify(asyncDepsIds)}`
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
		const { runtimeTemplate } = this.compilation;
		const fn = RuntimeGlobals.makeDeferredNamespaceObject;
		const hasAsync = this.hasAsyncRuntime;
		const strictError =
			this.compilation.options.output.strictModuleErrorHandling;
		return `${fn} = ${runtimeTemplate.basicFunction("moduleId, mode", [
			"// mode: 0 => namespace (esm)",
			"// mode: 1 => default-only (esm strict cjs)",
			"// mode: 2 => default-with-named (esm-cjs compat)",
			"// mode: 3 => dynamic (if exports has __esModule, then esm, otherwise default-with-named)",
			"",
			"var cachedModule = __webpack_module_cache__[moduleId];",
			...(strictError ? strictModuleCache : nonStrictModuleCache),
			"",
			"if (mode == 1) {",
			Template.indent([
				// if this var is changed to let or const, please define a new ns in the outer scope.
				"var ns = { __proto__: null };",
				`${RuntimeGlobals.makeNamespaceObject}(ns);`,
				`${RuntimeGlobals.definePropertyGetters}(ns, {`,
				Template.indent([
					'"default": ' +
						runtimeTemplate.returningFunction(
							`${RuntimeGlobals.require}(moduleId)`
						)
				]),
				"});",
				"return ns;"
			]),
			"}",
			"",
			`var init = ${runtimeTemplate.basicFunction("", [
				`ns = ${RuntimeGlobals.require}(moduleId);`,
				hasAsync
					? `if (${RuntimeGlobals.asyncModuleExportSymbol} in ns) ns = ns[${RuntimeGlobals.asyncModuleExportSymbol}];`
					: "",
				"init = null;",
				"if (mode == 3) {",
				Template.indent(["if (ns.__esModule) mode = 0;", "else mode = 2;"]),
				"}",
				"if (mode) return ns;",
				// this optimization only applies to esm because it's .exports cannot be assigned to another object.
				"delete handler.defineProperty;",
				"delete handler.deleteProperty;",
				"delete handler.set;",
				"delete handler.get;",
				"delete handler.has;",
				"delete handler.ownKeys;",
				"delete handler.getOwnPropertyDescriptor;",
				"return ns;"
			])};`,
			"",
			`ns = ${
				strictError ? "" : "cachedModule && cachedModule.exports || "
			}__webpack_module_deferred_exports__[moduleId] || (__webpack_module_deferred_exports__[moduleId] = { __proto__: null });`,
			"var handler = {",
			Template.indent([
				"__proto__: null,",
				`get: ${runtimeTemplate.basicFunction("_, name", [
					"switch (name) {",
					Template.indent([
						'case "__esModule": return true;',
						'case Symbol.toStringTag: return "Module";'
					]),
					"}",
					runtimeTemplate.supportsOptionalChaining()
						? "init?.();"
						: "if (init) init();",
					"// possible mode: 0, 2",
					"// for mode 2, ns.default is re-evaluated every time to reflect the latest module.exports value.",
					"// for the rest, we access the initial namespace object to keep esm semantics (export list is static).",
					`if (mode == 0 || name !== "default" || ${RuntimeGlobals.hasOwnProperty}(ns, name)) return ns[name];`,
					`return ${RuntimeGlobals.require}(moduleId);`
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
							Template.indent("return true;")
						].filter(Boolean)
					),
					"}",
					"if (init) init();",
					`return name in ns;`
				])},`,
				`ownKeys: ${runtimeTemplate.basicFunction("", [
					"if (init) init();",
					"return Reflect.ownKeys(ns);"
				])},`,
				`getOwnPropertyDescriptor: ${runtimeTemplate.basicFunction("_, name", [
					"switch (name) {",
					Template.indent([
						'case "__esModule": return { value: true, configurable: !!mode };',
						'case Symbol.toStringTag: return { value: "Module", configurable: !!mode };'
					]),
					"}",
					"if (init) init();",
					"var desc = Reflect.getOwnPropertyDescriptor(ns, name);",
					`if (mode == 2 && name == "default" && !desc) {`,
					Template.indent("desc = { value: ns, configurable: true };"),
					"}",
					"return desc;"
				])},`,
				`defineProperty: ${runtimeTemplate.basicFunction("_, name", [
					"if (init) init();",
					"return Reflect.defineProperty(ns, name);"
				])},`,
				`deleteProperty: ${runtimeTemplate.returningFunction("false")},`,
				`set: ${runtimeTemplate.returningFunction("false")},`
			]),
			"}",
			// we don't emulate ES Module semantics in this Proxy to align with normal webpack esm namespace object.
			"return new Proxy(ns, handler);"
		])};`;
	}
}

module.exports = MakeDeferredNamespaceObjectRuntimeModule;
module.exports.getMakeDeferredNamespaceModeFromExportsType =
	getMakeDeferredNamespaceModeFromExportsType;
module.exports.getOptimizedDeferredModule = getOptimizedDeferredModule;
