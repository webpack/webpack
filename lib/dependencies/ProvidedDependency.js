/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const Dependency = require("../Dependency");
const InitFragment = require("../InitFragment");
const Template = require("../Template");
const { InlinedUsedName } = require("../optimize/InlineExports");
const makeSerializable = require("../util/makeSerializable");
const { propertyAccess } = require("../util/property");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ExportsInfo").ExportInfoName} ExportInfoName */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, ExportInfoName[]]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, ExportInfoName[]]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class ProvidedDependency extends ModuleDependency {
	/**
	 * Creates an instance of ProvidedDependency.
	 * @param {string} request request
	 * @param {string} identifier identifier
	 * @param {ExportInfoName[]} ids ids
	 * @param {Range} range range
	 */
	constructor(request, identifier, ids, range) {
		super(request);
		/** @type {string} */
		this.identifier = identifier;
		/** @type {string[]} */
		this.ids = ids;
		this.range = range;
		/** @type {undefined | string} */
		this._hashUpdate = undefined;
	}

	get type() {
		return "provided";
	}

	get category() {
		return "esm";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		const ids = this.ids;
		if (ids.length === 0) return Dependency.EXPORTS_OBJECT_REFERENCED;
		return [ids];
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		if (this._hashUpdate === undefined) {
			this._hashUpdate = this.identifier + (this.ids ? this.ids.join(",") : "");
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.identifier).write(this.ids);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.identifier = context.read();
		const c1 = context.rest;
		this.ids = c1.read();
		super.deserialize(c1.rest);
	}
}

makeSerializable(
	ProvidedDependency,
	"webpack/lib/dependencies/ProvidedDependency"
);

class ProvidedDependencyTemplate extends ModuleDependency.Template {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{
			runtime,
			runtimeTemplate,
			moduleGraph,
			chunkGraph,
			initFragments,
			runtimeRequirements
		}
	) {
		const dep = /** @type {ProvidedDependency} */ (dependency);
		const connection =
			/** @type {ModuleGraphConnection} */
			(moduleGraph.getConnection(dep));
		const exportsInfo = moduleGraph.getExportsInfo(connection.module);
		const usedName = exportsInfo.getUsedName(dep.ids, runtime);

		const moduleRaw = runtimeTemplate.moduleRaw({
			module: moduleGraph.getModule(dep),
			chunkGraph,
			request: dep.request,
			runtimeRequirements
		});

		const provided = !usedName
			? moduleRaw
			: usedName instanceof InlinedUsedName
				? `(${moduleRaw}, ${usedName.render(
						Template.toNormalComment(
							`inlined export ${propertyAccess(dep.ids)}`
						)
					)})`
				: `${moduleRaw}${propertyAccess(usedName, 0)}`;

		initFragments.push(
			new InitFragment(
				`/* provided dependency */ var ${dep.identifier} = ${provided};\n`,
				InitFragment.STAGE_PROVIDES,
				1,
				`provided ${dep.identifier}`
			)
		);
		source.replace(dep.range[0], dep.range[1] - 1, dep.identifier);
	}
}

ProvidedDependency.Template = ProvidedDependencyTemplate;

module.exports = ProvidedDependency;
