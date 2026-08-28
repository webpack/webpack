/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const { propertyAccess } = require("../util/property");

/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../serialization/ObjectMiddleware"
 */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import Module from "../Module" */
/** @import { RuntimeSpec } from "../util/runtime" */

const MAX_INLINE_BYTES = 6;

/** @typedef {"null" | "undefined" | "boolean" | "number" | "string"} InlinedValueKind */

class InlinedValue {
	/**
	 * @param {InlinedValueKind} kind value kind
	 * @param {null | undefined | boolean | number | string} value raw value
	 */
	constructor(kind, value) {
		/** @type {InlinedValueKind} */
		this.kind = kind;
		/** @type {string | number | boolean | null | undefined} */
		this.value = value;
	}

	/**
	 * @returns {string} rendered literal source
	 */
	renderLiteral() {
		switch (this.kind) {
			case "null":
				return "null";
			case "undefined":
				return "undefined";
			case "boolean":
				return this.value ? "true" : "false";
			case "number":
				return String(this.value);
			case "string":
				return JSON.stringify(this.value);
		}
	}

	/**
	 * @param {string} comment leading comment text
	 * @returns {string} parenthesized literal with comment
	 */
	render(comment) {
		return `(${comment}${this.renderLiteral()})`;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize({ write }) {
		write(this.kind);
		write(this.value);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize({ read }) {
		this.kind = read();
		this.value = read();
	}
}

makeSerializable(
	InlinedValue,
	"webpack/lib/optimize/InlineExports",
	"InlinedValue"
);

class InlinedUsedName {
	/**
	 * @param {InlinedValue} value inlined value
	 * @param {string[]=} suffix nested property access after the literal
	 */
	constructor(value, suffix) {
		/** @type {InlinedValue} */
		this.value = value;
		/** @type {string[]} */
		this.suffix = suffix || [];
	}

	/**
	 * @param {string} comment leading comment text
	 * @returns {string} rendered literal with property access suffix
	 */
	render(comment) {
		return this.value.render(comment) + propertyAccess(this.suffix);
	}
}

/**
 * Convert an evaluated expression into an inlined primitive value if it qualifies.
 * @param {import("../javascript/BasicEvaluatedExpression")} evaluated evaluated expression
 * @returns {InlinedValue | undefined} inlined value or undefined
 */
const toInlinedValue = (evaluated) => {
	if (!evaluated) return;
	if (evaluated.isNull()) return new InlinedValue("null", null);
	if (evaluated.isUndefined()) return new InlinedValue("undefined", undefined);
	if (evaluated.isBoolean()) {
		return new InlinedValue("boolean", /** @type {boolean} */ (evaluated.bool));
	}
	if (evaluated.isNumber()) {
		const num = /** @type {number} */ (evaluated.number);
		if (String(num).length > MAX_INLINE_BYTES) return;
		return new InlinedValue("number", num);
	}
	if (evaluated.isString()) {
		const str = /** @type {string} */ (evaluated.string);
		if (str.length > MAX_INLINE_BYTES) return;
		return new InlinedValue("string", str);
	}
};

/** @type {WeakSet<ModuleGraph>} */
const inlineEnabledModuleGraphs = new WeakSet();

/**
 * Marks export inlining as active for this module graph (set by InlineExportsPlugin).
 * @param {ModuleGraph} moduleGraph module graph
 * @returns {void}
 */
const enableInlineExports = (moduleGraph) => {
	inlineEnabledModuleGraphs.add(moduleGraph);
};

/**
 * @param {ModuleGraph} moduleGraph module graph
 * @returns {boolean} true when InlineExportsPlugin is active for this module graph
 */
const isInlineExportsEnabled = (moduleGraph) =>
	inlineEnabledModuleGraphs.has(moduleGraph);

/**
 * @param {Module} module the target module
 * @returns {boolean} true when inlining is enabled for this module
 */
const isInlineEnabled = (module) =>
	Boolean(
		module.buildInfo &&
		/** @type {import("../Module").BuildInfo} */
		(module.buildInfo).inlineExports
	);

/**
 * Check whether an import to `module` for `ids` resolves to an inlined value.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Module} module the target module
 * @param {string[]} ids import ids
 * @param {RuntimeSpec} runtime runtime
 * @returns {boolean} true if the export is inlined
 */
const isExportInlined = (moduleGraph, module, ids, runtime) => {
	if (!ids || ids.length === 0) return false;
	if (!isInlineEnabled(module)) return false;
	return moduleGraph.getExportsInfo(module).hasInlinedUsedName(ids, runtime);
};

/**
 * Collects, by an iterative Tarjan pass, the modules a cycle peer may read in
 * their dead zone. A cycle of bare side-effect imports still inlines.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Iterable<Module>} modules all modules of the compilation
 * @returns {Set<Module>} modules whose exports must not be inlined
 */
const findModulesInCycles = (moduleGraph, modules) => {
	const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
	const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");

	/** @type {Set<Module>} */
	const inCycle = new Set();
	/** @type {[Module, Module][]} */
	const bindingReads = [];
	/** @type {Map<Module, number>} */
	const componentOf = new Map();
	let nextComponent = 0;
	/** @type {Map<Module, number>} */
	const index = new Map();
	/** @type {Map<Module, number>} */
	const low = new Map();
	/** @type {Set<Module>} */
	const onStack = new Set();
	/** @type {Module[]} */
	const componentStack = [];
	let counter = 0;
	/**
	 * @param {Module} module the module
	 * @returns {Module[]} modules it imports, self included when self-importing
	 */
	const targetsOf = (module) => {
		const connections = moduleGraph.getOutgoingConnectionsByModule(module);
		if (!connections) return [];
		/** @type {Module[]} */
		const targets = [];
		for (const [target, moduleConnections] of connections) {
			if (
				!target ||
				!moduleConnections.some(
					(c) => c.dependency instanceof HarmonyImportDependency
				)
			) {
				continue;
			}
			// Anything but a bare side-effect import may observe the binding.
			if (
				moduleConnections.some(
					(c) =>
						c.dependency instanceof HarmonyImportDependency &&
						!(c.dependency instanceof HarmonyImportSideEffectDependency)
				)
			) {
				bindingReads.push([module, target]);
			}
			targets.push(target);
		}
		return targets;
	};
	/** @type {{ node: Module, targets: Module[], i: number }[]} */
	const work = [];
	/**
	 * @param {Module} node node to open
	 */
	const open = (node) => {
		index.set(node, counter);
		low.set(node, counter);
		counter++;
		componentStack.push(node);
		onStack.add(node);
		work.push({ node, targets: targetsOf(node), i: 0 });
	};
	for (const seed of modules) {
		if (index.has(seed)) continue;
		open(seed);
		while (work.length > 0) {
			const frame = work[work.length - 1];
			if (frame.i < frame.targets.length) {
				const next = frame.targets[frame.i++];
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
				const id = nextComponent++;
				let member;
				do {
					member = /** @type {Module} */ (componentStack.pop());
					onStack.delete(member);
					componentOf.set(member, id);
				} while (member !== node);
			}
		}
	}
	// Reader and target evaluate together exactly when they share a component.
	for (const [origin, target] of bindingReads) {
		if (
			origin === target ||
			componentOf.get(origin) === componentOf.get(target)
		) {
			inCycle.add(target);
		}
	}
	return inCycle;
};

module.exports.InlinedUsedName = InlinedUsedName;
module.exports.InlinedValue = InlinedValue;
module.exports.MAX_INLINE_BYTES = MAX_INLINE_BYTES;
module.exports.enableInlineExports = enableInlineExports;
module.exports.findModulesInCycles = findModulesInCycles;
module.exports.isExportInlined = isExportInlined;
module.exports.isInlineEnabled = isInlineEnabled;
module.exports.isInlineExportsEnabled = isInlineExportsEnabled;
module.exports.toInlinedValue = toInlinedValue;
