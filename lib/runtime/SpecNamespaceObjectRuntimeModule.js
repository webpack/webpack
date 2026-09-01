/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @import Compilation from "../Compilation" */

class SpecNamespaceObjectRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("spec namespace object");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const cst = runtimeTemplate.renderConst();
		const fn = RuntimeGlobals.specNamespaceObject;
		return Template.asString([
			`${fn} = ${runtimeTemplate.basicFunction("exports", [
				`${cst} cached = ${fn}.c.get(exports);`,
				"if (cached) return cached;",
				// The exports object keeps the live bindings; the proxy target only
				// carries their names, sealed so the traps may report spec
				// descriptors without tripping the proxy invariants.
				`${cst} names = Object.getOwnPropertyNames(exports).filter(${runtimeTemplate.expressionFunction(
					"name !== '__esModule'",
					"name"
				)}).sort();`,
				`${cst} target = { __proto__: null };`,
				"for (var i = 0; i < names.length; i++) Object.defineProperty(target, names[i], { value: undefined, writable: true, enumerable: true, configurable: false });",
				"Object.defineProperty(target, Symbol.toStringTag, { value: 'Module' });",
				"Object.preventExtensions(target);",
				`${cst} own = ${runtimeTemplate.expressionFunction(
					"typeof name === 'string' && Object.prototype.hasOwnProperty.call(target, name)",
					"name"
				)};`,
				`${cst} ns = new Proxy(target, {`,
				Template.indent([
					"__proto__: null,",
					"getPrototypeOf: function() { return null; },",
					"setPrototypeOf: function(_, proto) { return proto === null; },",
					"isExtensible: function() { return false; },",
					"preventExtensions: function() { return true; },",
					"get: function(_, name, receiver) { return own(name) ? exports[name] : Reflect.get(target, name, receiver); },",
					"has: function(_, name) { return own(name) || Reflect.has(target, name); },",
					"ownKeys: function() { return Reflect.ownKeys(target); },",
					"getOwnPropertyDescriptor: function(_, name) { return own(name) ? { value: exports[name], writable: true, enumerable: true, configurable: false } : Reflect.getOwnPropertyDescriptor(target, name); },",
					"set: function() { return false; },",
					// A namespace may only be redefined to the descriptor it
					// already reports, so anything else is rejected.
					"defineProperty: function(_, name, descriptor) {",
					Template.indent([
						// Symbol keys are ordinary, so redefining Symbol.toStringTag
						// to the descriptor it already has must still succeed.
						"if (typeof name === 'symbol') return Reflect.defineProperty(target, name, descriptor);",
						"if (!own(name) || 'get' in descriptor || 'set' in descriptor) return false;",
						"if (descriptor.configurable === true || descriptor.enumerable === false || descriptor.writable === false) return false;",
						"return !('value' in descriptor) || Object.is(descriptor.value, exports[name]);"
					]),
					"},",
					"deleteProperty: function(_, name) { return !own(name) && !Reflect.has(target, name); }"
				]),
				"});",
				`${fn}.c.set(exports, ns);`,
				"return ns;"
			])};`,
			// The same exports object must always yield the same namespace.
			`${fn}.c = new WeakMap();`
		]);
	}
}

module.exports = SpecNamespaceObjectRuntimeModule;
