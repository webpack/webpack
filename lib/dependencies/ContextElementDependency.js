/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").Attributes} Attributes */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class ContextElementDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {string|undefined} userRequest user request
	 * @param {string} typePrefix type prefix
	 * @param {string} category category
	 * @param {string[][]=} referencedExports referenced exports
	 * @param {string=} context context
	 * @param {Attributes=} attributes attributes
	 */
	constructor(
		request,
		userRequest,
		typePrefix,
		category,
		referencedExports,
		context,
		attributes
	) {
		super(request);
		this.referencedExports = referencedExports;
		this._typePrefix = typePrefix;
		this._category = category;
		this._context = context || undefined;

		if (userRequest) {
			this.userRequest = userRequest;
		}

		this.assertions = attributes;
	}

	get type() {
		if (this._typePrefix) {
			return `${this._typePrefix} context element`;
		}

		return "context element";
	}

	get category() {
		return this._category;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {(string[] | ReferencedExport)[]} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return this.referencedExports
			? this.referencedExports.map(e => ({
					name: e,
					canMangle: false
				}))
			: Dependency.EXPORTS_OBJECT_REFERENCED;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this._typePrefix);
		write(this._category);
		write(this.referencedExports);
		write(this.assertions);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this._typePrefix = read();
		this._category = read();
		this.referencedExports = read();
		this.assertions = read();
		super.deserialize(context);
	}
}

makeSerializable(
	ContextElementDependency,
	"webpack/lib/dependencies/ContextElementDependency"
);

module.exports = ContextElementDependency;
