/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../graph/Dependency");
const makeSerializable = require("../util/makeSerializable");
const { ImportPhaseUtils } = require("./ImportPhase");
const ModuleDependency = require("./ModuleDependency");

/** @import ContextModule from "../context/ContextModule" */
/** @import { RawReferencedExports, ReferencedExports } from "../graph/Dependency" */
/** @import Module from "../module/Module" */
/** @import ModuleGraph from "../graph/ModuleGraph" */
/** @import { ImportAttributes } from "../javascript/JavascriptParser" */
/** @import { RuntimeSpec } from "../util/runtime" */
/** @import { ImportPhaseType } from "./ImportPhase" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string | undefined, string, RawReferencedExports | null | undefined, ImportAttributes | undefined, string | undefined, ImportPhaseType | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string | undefined, string, RawReferencedExports | null | undefined, ImportAttributes | undefined, string | undefined, ImportPhaseType | undefined]>} ObjectSerializerContext */

class ContextElementDependency extends ModuleDependency {
	/**
	 * Creates an instance of ContextElementDependency.
	 * @param {string} request request
	 * @param {string | undefined} userRequest user request
	 * @param {string | undefined} typePrefix type prefix
	 * @param {string} category category
	 * @param {RawReferencedExports | null=} referencedExports referenced exports
	 * @param {string=} context context
	 * @param {ImportAttributes=} attributes import assertions
	 * @param {string=} contextRequest the request of the context as written by the user, without query and fragment
	 * @param {ImportPhaseType=} phase the phase the context was imported in
	 */
	constructor(
		request,
		userRequest,
		typePrefix,
		category,
		referencedExports,
		context,
		attributes,
		contextRequest,
		phase
	) {
		super(request);

		if (userRequest) {
			/** @type {string} */
			this.userRequest = userRequest;
		}

		/** @type {string | undefined} */
		this._typePrefix = typePrefix;
		/** @type {string} */
		this._category = category;
		/** @type {RawReferencedExports | null | undefined} */
		this.referencedExports = referencedExports;
		/** @type {string | undefined} */
		this._context = context || undefined;
		/** @type {ImportAttributes | undefined} */
		this.attributes = attributes;
		/** @type {string | undefined} */
		this._contextRequest = contextRequest || undefined;
		/** @type {ImportPhaseType | undefined} */
		this.phase = phase;
	}

	/**
	 * The request as the user wrote it, e.g. `#configs/file.mjs` where `request`
	 * is the `./file.mjs` relative to the resolved `#configs` directory.
	 * @returns {string} the original request
	 */
	get originalRequest() {
		const request = this.request;
		if (this._contextRequest === undefined || !request.startsWith("./")) {
			return request;
		}
		return this._contextRequest + request.slice(1);
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
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		let str = super.getResourceIdentifier();
		if (this.attributes) {
			str += `|attributes${JSON.stringify(this.attributes)}`;
		}
		// We specifically use this check to avoid writing the default (`evaluation` or `0`) value and save memory
		if (this.phase) {
			str += `|phase${ImportPhaseUtils.stringify(this.phase)}`;
		}
		return str;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		if (!this.referencedExports) return Dependency.EXPORTS_OBJECT_REFERENCED;
		/** @type {ReferencedExports} */
		const refs = [];
		for (const referencedExport of this.referencedExports) {
			if (
				this._typePrefix === "import()" &&
				referencedExport[0] === "default"
			) {
				const selfModule =
					/** @type {ContextModule} */
					(moduleGraph.getParentModule(this));
				const importedModule =
					/** @type {Module} */
					(moduleGraph.getModule(this));
				const exportsType = importedModule.getExportsType(
					moduleGraph,
					selfModule.options.namespaceObject === "strict"
				);
				if (
					exportsType === "default-only" ||
					exportsType === "default-with-named"
				) {
					return Dependency.EXPORTS_OBJECT_REFERENCED;
				}
			}
			refs.push({
				name: referencedExport,
				canMangle: false,
				canInline: false
			});
		}
		return refs;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this._typePrefix)
			.write(this._category)
			.write(this.referencedExports)
			.write(this.attributes)
			.write(this._contextRequest)
			.write(this.phase);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this._typePrefix = context.read();
		const c1 = context.rest;
		this._category = c1.read();
		const c2 = c1.rest;
		this.referencedExports = c2.read();
		const c3 = c2.rest;
		this.attributes = c3.read();
		const c4 = c3.rest;
		this._contextRequest = c4.read();
		const c5 = c4.rest;
		this.phase = c5.read();
		super.deserialize(c5.rest);
	}
}

makeSerializable(
	ContextElementDependency,
	"webpack/lib/dependencies/ContextElementDependency"
);

module.exports = ContextElementDependency;
