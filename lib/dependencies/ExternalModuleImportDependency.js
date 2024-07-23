/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const CachedConstDependency = require("./CachedConstDependency");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptModulesPlugin").ChunkRenderContext} ChunkRenderContext */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */

class ExternalModuleImportDependency extends ModuleDependency {
	/**
	 * @param {string} request the request
	 * @param {string| string[]} targetRequest the original request
	 * @param {Range} range expression range
	 */
	constructor(request, targetRequest, range) {
		super(request);
		this.targetRequest = targetRequest;
		this.range = range;
	}

	get type() {
		return "external module-import";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.targetRequest);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.targetRequest = read();
		super.deserialize(context);
	}
}

makeSerializable(
	ExternalModuleImportDependency,
	"webpack/lib/dependencies/ExternalModuleImportDependency"
);

ExternalModuleImportDependency.Template = class ExternalModuleImportDependencyTemplate extends (
	CachedConstDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {ExternalModuleImportDependency} */ (dependency);
		const content = JSON.stringify(dep.targetRequest);
		source.replace(dep.range[0], dep.range[1] - 1, `import(${content})`);
	}
};

module.exports = ExternalModuleImportDependency;
