/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const ModuleDependency = require("../core/ModuleDependency");
const NullDependency = require("../core/NullDependency");

/** @import { DependencyKinds, UpdateHashContext } from "../../graph/Dependency" */
/** @import Hash from "../../util/Hash" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[string | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[string | undefined]>} ObjectSerializerContext */

/**
 * A `<link rel="stylesheet">` seen from the page that links it. The stylesheet
 * is an entry of its own; this weak edge only lets the page read the names a
 * CSS module stylesheet gives its classes and ids, to rewrite its `class` and
 * `id` with them, so it adds the stylesheet to none of the page's chunks.
 */
class HtmlCssModuleDependency extends ModuleDependency {
	/**
	 * @param {string} request request of the linked stylesheet, as its entry has it
	 * @param {string=} cssModuleName the name a `<link rel="stylesheet" module="card">` gives it, so the page reads its names only as `card.btn`
	 */
	constructor(request, cssModuleName) {
		super(request);
		this.weak = true;
		/** @type {string | undefined} */
		this.cssModuleName = cssModuleName;
	}

	get type() {
		return "html css module";
	}

	// The category its entry is resolved with, so both name one module.
	get category() {
		return "esm";
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		if (this.cssModuleName !== undefined) hash.update(this.cssModuleName);
		// The page's markup changes with the names, so it changes with the sheet.
		const module = context.chunkGraph.moduleGraph.getModule(this);
		if (module) module.updateHash(hash, context);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.cssModuleName);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.cssModuleName = context.read();
		super.deserialize(context);
	}
}

// Writes nothing: `HtmlCssModuleNamesDependency` reads what it links to.
HtmlCssModuleDependency.Template = NullDependency.Template;

makeSerializable(
	HtmlCssModuleDependency,
	"webpack/lib/dependencies/html/HtmlCssModuleDependency"
);

/** @type {Set<keyof DependencyKinds>} */
HtmlCssModuleDependency.KINDS = new Set([
	...ModuleDependency.KINDS,
	"html-css-module"
]);

module.exports = HtmlCssModuleDependency;
