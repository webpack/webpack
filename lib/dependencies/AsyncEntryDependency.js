/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const Dependency = require("../Dependency");
const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class AsyncEntryDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {string} category category
	 * @param {[number, number]} range range
	 * @param {string} returnValue returned value
	 */
	constructor(request, category, range, returnValue) {
		super(request);
		this._category = category;
		this.range = range;
		this.returnValue = returnValue;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {(string[] | ReferencedExport)[]} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return Dependency.EXPORTS_OBJECT_REFERENCED;
	}

	get type() {
		return "async entry";
	}

	get category() {
		return this._category;
	}

	serialize(context) {
		context.write(this._category);
		context.write(this.returnValue);
		super.serialize(context);
	}

	deserialize(context) {
		this._category = context.read();
		this.returnValue = context.read();
		super.deserialize(context);
	}
}

AsyncEntryDependency.Template = class AsyncEntryDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const {
			chunkGraph,
			moduleGraph,
			runtimeRequirements,
			runtimeTemplate
		} = templateContext;
		const dep = /** @type {AsyncEntryDependency} */ (dependency);
		const block = /** @type {AsyncDependenciesBlock} */ (moduleGraph.getParentBlock(
			dependency
		));
		const entrypoint = /** @type {Entrypoint} */ (chunkGraph.getBlockChunkGroup(
			block
		));

		if (!entrypoint) return;

		let result;
		if (typeof dep.returnValue !== "string") {
			result = JSON.stringify(dep.returnValue);
		} else {
			switch (dep.returnValue) {
				case undefined:
				case "void":
					result = "undefined";
					break;
				case "files": {
					const chunks = entrypoint.chunks;

					// TODO allow non-js types to return files too

					runtimeRequirements.add(RuntimeGlobals.getChunkScriptFilename);
					result = `/* async entry files */ ${JSON.stringify(
						chunks.map(chunk => chunk.id)
					)}.map(${RuntimeGlobals.getChunkScriptFilename})`;
					break;
				}
				case "urls": {
					const chunks = entrypoint.chunks;

					runtimeRequirements.add(RuntimeGlobals.publicPath);
					runtimeRequirements.add(RuntimeGlobals.baseURI);
					runtimeRequirements.add(RuntimeGlobals.getChunkScriptFilename);
					result = `/* async entry urls */ ${JSON.stringify(
						chunks.map(chunk => chunk.id)
					)}.map(${runtimeTemplate.returningFunction(
						`new URL(${JSON.stringify(RuntimeGlobals.publicPath)} + ${
							RuntimeGlobals.getChunkScriptFilename
						}(id), ${RuntimeGlobals.baseURI})`,
						"id"
					)})`;
					break;
				}
				default:
					if (dep.returnValue.startsWith("value ")) {
						result = JSON.stringify(dep.returnValue.slice(6));
					} else {
						throw new Error(`Unexpected returnValue '${dep.returnValue}'`);
					}
					break;
			}
		}
		source.replace(dep.range[0], dep.range[1] - 1, result);
	}
};

makeSerializable(
	AsyncEntryDependency,
	"webpack/lib/dependencies/AsyncEntryDependency"
);

module.exports = AsyncEntryDependency;
