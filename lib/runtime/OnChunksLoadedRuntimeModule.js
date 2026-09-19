/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Template = require("../template/Template");
const { getOnlyHandlerKey } = require("../util/handlerKeys");
const { propertyAccess } = require("../util/property");
const RuntimeGlobals = require("./RuntimeGlobals");
const RuntimeModule = require("./RuntimeModule");

/** @import Compilation from "../Compilation" */
/** @import { ReadOnlyRuntimeRequirements } from "../Module" */

class OnChunksLoadedRuntimeModule extends RuntimeModule {
	/**
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("chunk loaded");
		/** @type {ReadOnlyRuntimeRequirements} */
		this.runtimeRequirements = runtimeRequirements;
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		// Reads a map rather than installing onto one, so reading its code back would
		// render it in a cycle.
		return RuntimeModule.NO_CHUNK_HANDLERS;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		// Only a prefetch startup callback is queued behind a priority, so without one
		// the queue keeps insertion order and nothing has to hold the lowest seen.
		const withPriority = this.runtimeRequirements.has(
			RuntimeGlobals.hasChunkPriority
		);
		const only = getOnlyHandlerKey(this, RuntimeGlobals.onChunksLoaded);
		return Template.asString([
			`${runtimeTemplate.renderConst()} deferred = [];`,
			`${RuntimeGlobals.onChunksLoaded} = ${runtimeTemplate.basicFunction(
				`result, chunkIds, fn${withPriority ? ", priority" : ""}`,
				[
					"if(chunkIds) {",
					Template.indent(
						withPriority
							? [
									`${runtimeTemplate.assignOr("priority", "0")};`,
									"for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];",
									"deferred[i] = [chunkIds, fn, priority];",
									"return;"
								]
							: ["deferred.push([chunkIds, fn]);", "return;"]
					),
					"}",
					...(withPriority
						? [`${runtimeTemplate.renderLet()} notFulfilled = Infinity;`]
						: []),
					"for (var i = 0; i < deferred.length; i++) {",
					Template.indent([
						runtimeTemplate.destructureArray(
							withPriority
								? ["chunkIds", "fn", "priority"]
								: ["chunkIds", "fn"],
							"deferred[i]"
						),
						`${runtimeTemplate.renderLet()} fulfilled = true;`,
						"for (var j = 0; j < chunkIds.length; j++) {",
						Template.indent([
							// Parenthesized: `&` binds looser than `===`, so `priority & 1 === 0`
							// is `priority & false` and gates every priority, not just the odd ones.
							`if (${
								withPriority
									? "((priority & 1) === 0 || notFulfilled >= priority) && "
									: ""
							}${
								only === null
									? `Object.keys(${
											RuntimeGlobals.onChunksLoaded
										}).every(${runtimeTemplate.returningFunction(
											`${RuntimeGlobals.onChunksLoaded}[key](chunkIds[j])`,
											"key"
										)})`
									: `${RuntimeGlobals.onChunksLoaded}${propertyAccess([
											only
										])}(chunkIds[j])`
							}) {`,
							Template.indent(["chunkIds.splice(j--, 1);"]),
							"} else {",
							Template.indent(
								withPriority
									? [
											"fulfilled = false;",
											"if(priority < notFulfilled) notFulfilled = priority;"
										]
									: ["fulfilled = false;"]
							),
							"}"
						]),
						"}",
						"if(fulfilled) {",
						Template.indent([
							"deferred.splice(i--, 1)",
							`${runtimeTemplate.renderConst()} r = fn();`,
							"if (r !== undefined) result = r;"
						]),
						"}"
					]),
					"}",
					"return result;"
				]
			)};`
		]);
	}
}

module.exports = OnChunksLoadedRuntimeModule;
