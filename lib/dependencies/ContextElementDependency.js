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
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class ContextElementDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {string|undefined} userRequest user request
	 * @param {string} typePrefix type prefix
	 * @param {string} category category
	 * @param {string[][]=} referencedExports referenced exports
	 * @param {string=} context context
	 */
	constructor(
		request,
		userRequest,
		typePrefix,
		category,
		referencedExports,
		context
	) {
		super(request);
		this.referencedExports = referencedExports;
		this._typePrefix = typePrefix;
		this._category = category;
		this._context = context || undefined;

		if (userRequest) {
			this.userRequest = userRequest;
		}
	}

	get type() {
		if (this._typePrefix) {
			return `${this._typePrefix} context element`;
		}

		return "context element";
	}

	/**
	 * @returns {string | undefined} a request context
	 */
	getContext() {
		return this._context;
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `context${this._context || ""}|${super.getResourceIdentifier()}`;
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

	serialize(context) {
		const { write } = context;
		write(this._typePrefix);
		write(this._category);
		write(this._context);
		write(this.referencedExports);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this._typePrefix = read();
		this._category = read();
		this._context = read();
		this.referencedExports = read();
		super.deserialize(context);
	}
}

makeSerializable(
	ContextElementDependency,
	"webpack/lib/dependencies/ContextElementDependency"
);

module.exports = ContextElementDependency;
