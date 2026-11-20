/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const Template = require("../template/Template");

/** @import ChunkGraph from "../graph/ChunkGraph" */
/** @import ModuleGraph from "../graph/ModuleGraph" */
/** @import Module from "../module/Module" */
/** @import Hash from "../util/Hash" */
/** @import RuntimeTemplate from "../template/RuntimeTemplate" */

/**
 * Where a module linked across chunks lives: the scope it is hoisted into and its position there.
 * @typedef {object} LinkedBinding
 * @property {Module} scope the module whose top-level scope declares the linked module's bindings
 * @property {number} index the linked module's position among the modules the scope exposes
 */

/**
 * Returns whether modules may be linked across the chunks of this build: an ESM output with `optimization.concatenateModules.linkChunks`.
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {boolean} true when linking is enabled
 */
const isLinkChunksEnabled = (runtimeTemplate) => {
	if (!runtimeTemplate.isModule()) return false;
	const { concatenateModules } =
		runtimeTemplate.compilation.options.optimization;
	return (
		typeof concatenateModules === "object" &&
		concatenateModules.linkChunks === true
	);
};

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
 * @param {LinkedBinding} binding the linked binding
 * @param {string} usedName the export's used (possibly mangled) name
 * @returns {string} the exported name
 */
const getLinkedExportName = (binding, usedName) =>
	`$${binding.index}${usedName}`;

/**
 * Returns the local name an importer binds a linked export to; unique per chunk graph.
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {LinkedBinding} binding the linked binding
 * @param {string} usedName the export's used (possibly mangled) name
 * @returns {string} the binding name
 */
const getLinkedBindingName = (chunkGraph, binding, usedName) =>
	`__webpack_linked_${Template.toIdentifier(
		`${chunkGraph.getModuleId(binding.scope)}`
	)}_${binding.index}_${usedName}__`;

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
		`linked ${chunkGraph.getModuleId(binding.scope)} ${binding.index}`
	);
	for (const chunk of chunkGraph.getModuleChunksIterable(binding.scope)) {
		hash.update(` ${chunk.id}`);
	}
};

module.exports = {
	getLinkedBinding,
	getLinkedBindingName,
	getLinkedExportName,
	isLinkChunksEnabled,
	isLinkedScope,
	updateLinkedHash
};
