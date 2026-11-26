/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { ImportPhaseUtils } = require("../dependencies/core/ImportPhase");
const isDependencyKind = require("../graph/isDependencyKind");

/** @import ChunkGraph from "../graph/ChunkGraph.js" */
/** @import ModuleGraph from "../graph/ModuleGraph.js" */
/** @import Module from "../module/Module.js" */
/** @import Hash from "../util/Hash.js" */
/** @import ModuleDependency from "../dependencies/core/ModuleDependency.js" */
/** @import { RuntimeSpec } from "../util/runtime.js" */

/**
 * Where a module linked across chunks lives: the scope it is hoisted into and its position there.
 * @typedef {object} LinkedBinding
 * @property {Module} scope the module whose top-level scope declares the linked module's bindings
 * @property {number} index the linked module's position among the modules the scope exposes
 * @property {boolean} init whether the scope runs the module in an init function each importer calls where its import stands
 */

/**
 * Returns where a module linked across chunks lives, if it is linked.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the imported module
 * @returns {LinkedBinding | undefined} the linked binding, or undefined for a module in the registry
 */
const getLinkedBinding = (moduleGraph, module) => {
	const meta = moduleGraph.getMetaIfExisting(module);
	return meta === undefined ? undefined : meta.linkedBinding;
};

/**
 * Returns whether the module is a scope rendered at its chunk's top level instead of in the registry.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the module
 * @returns {boolean} true for a linked scope
 */
const isLinkedScope = (moduleGraph, module) => {
	const meta = moduleGraph.getMetaIfExisting(module);
	return meta !== undefined && meta.linkedScope === true;
};

/**
 * Returns the short name a linked scope exports an export under; unique within its chunk, as a used name never starts with a digit.
 * @param {number} index the module's position among the modules the scope exposes
 * @param {string} usedName the export's used (possibly mangled) name
 * @returns {string} the exported name
 */
const getLinkedExportName = (index, usedName) => `$${index}${usedName}`;

/**
 * Returns the name a linked scope exports a module's init function under; no export name starts with `_$`.
 * @param {number} index the module's position among the modules the scope exposes
 * @returns {string} the exported name
 */
const getLinkedInitExportName = (index) => `_$${index}`;

// every character of a module id the name escapes, `_` included, so that the
// first `_` after the id ends it and two ids never give the same name
const NON_ALPHANUMERIC = /[^a-zA-Z0-9]/g;

/**
 * Returns the identifier-safe escape of one module id character.
 * @param {string} character the character
 * @returns {string} `$`, its char code in base 36, and `$`
 */
const escapeCharacter = (character) =>
	`$${character.charCodeAt(0).toString(36)}$`;

/**
 * Returns the local name an importer binds a linked export to; distinct for every scope, index and used name.
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {LinkedBinding} binding the linked binding
 * @param {string} usedName the export's used (possibly mangled) name
 * @returns {string} the binding name
 */
const getLinkedBindingName = (chunkGraph, binding, usedName) =>
	`__webpack_linked_${`${chunkGraph.getModuleId(binding.scope)}`.replace(
		NON_ALPHANUMERIC,
		escapeCharacter
	)}_${binding.index}_${usedName}__`;

/**
 * Returns the local name an importer binds a linked module's init function to; a `$` after the index sets it apart from every export's.
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {LinkedBinding} binding the linked binding
 * @returns {string} the binding name
 */
const getLinkedInitBindingName = (chunkGraph, binding) =>
	`__webpack_linked_${`${chunkGraph.getModuleId(binding.scope)}`.replace(
		NON_ALPHANUMERIC,
		escapeCharacter
	)}_${binding.index}$__`;

/**
 * Adds where an imported module is linked to the hash, as it decides the names and the chunk the importer imports from.
 * @param {Hash} hash the hash to update
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Module | null} module the imported module
 * @returns {void}
 */
const updateLinkedHash = (hash, chunkGraph, module) => {
	const binding = getLinkedBinding(
		chunkGraph.moduleGraph,
		/** @type {Module} */ (module)
	);
	if (binding === undefined) return;
	hash.update(
		`linked ${chunkGraph.getModuleId(binding.scope)} ${binding.index}${
			binding.init ? " init" : ""
		}`
	);
	for (const chunk of chunkGraph.getModuleChunksIterable(binding.scope)) {
		hash.update(` ${chunk.id}`);
	}
};

/**
 * Returns the modules evaluating a module evaluates first: its static ES imports in source order, then what its body loads synchronously.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the module
 * @param {RuntimeSpec} runtime the runtime
 * @returns {{ imports: Module[], others: Module[] }} the imported and the otherwise loaded modules
 */
const getEvaluatedDependencies = (moduleGraph, module, runtime) => {
	/** @type {Map<Module, number>} */
	const importOrder = new Map();
	/** @type {Set<Module>} */
	const others = new Set();
	for (const connection of moduleGraph.getOutgoingConnections(module)) {
		const target = connection.module;
		const { dependency } = connection;
		if (
			!target ||
			!dependency ||
			target === module ||
			// an `import()` evaluates its target in a later chunk group
			moduleGraph.getParentBlock(dependency) !== module ||
			!connection.isTargetActive(runtime)
		) {
			continue;
		}
		if (isDependencyKind(dependency, "esm-import")) {
			// an `import defer` evaluates its target on first access instead
			if (ImportPhaseUtils.isDefer(dependency.phase)) continue;
			const { sourceOrder } = /** @type {ModuleDependency} */ (dependency);
			const order = typeof sourceOrder === "number" ? sourceOrder : Infinity;
			const previous = importOrder.get(target);
			if (previous === undefined || order < previous) {
				importOrder.set(target, order);
			}
		} else {
			others.add(target);
		}
	}
	const imports = [...importOrder.keys()].sort(
		(a, b) =>
			/** @type {number} */ (importOrder.get(a)) -
			/** @type {number} */ (importOrder.get(b))
	);
	for (const imported of imports) others.delete(imported);
	return { imports, others: [...others] };
};

module.exports = {
	getEvaluatedDependencies,
	getLinkedBinding,
	getLinkedBindingName,
	getLinkedExportName,
	getLinkedInitBindingName,
	getLinkedInitExportName,
	isLinkedScope,
	updateLinkedHash
};
