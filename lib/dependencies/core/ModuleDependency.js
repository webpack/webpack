/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../../graph/Dependency");
const DependencyTemplate = require("../../template/DependencyTemplate");

/** @import { TRANSITIVE, DependencyKinds } from "../../graph/Dependency" */
/** @import Module from "../../module/Module" */
/** @import { Range } from "../../javascript/JavascriptParser" */
/** @import { ComplexSerializableType } from "../../serialization/types" */
/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../../serialization/ObjectMiddleware"
 */

class ModuleDependency extends Dependency {
	/**
	 * Creates an instance of ModuleDependency.
	 * @param {string} request request path which needs resolving
	 * @param {number=} sourceOrder source order
	 */
	constructor(request, sourceOrder) {
		super();
		/** @type {string} */
		this.request = request;
		/** @type {string} */
		this.userRequest = request;
		/** @type {number | undefined} */
		this.sourceOrder = sourceOrder;
		/** @type {Range | undefined} */
		this.range = undefined;
		/** @type {undefined | string} */
		this._context = undefined;
		/** @type {boolean} */
		this.weak = false;
	}

	/**
	 * Returns a request context.
	 * @returns {string | undefined} a request context
	 */
	getContext() {
		return this._context;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `context${this._context || ""}|module${this.request}`;
	}

	/**
	 * Could affect referencing module.
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		return true;
	}

	/**
	 * Creates an ignored module.
	 * @param {string} context context directory
	 * @returns {Module} ignored module
	 */
	createIgnoredModule(context) {
		const RawModule = require("../../module/RawModule");

		const module = new RawModule(
			"/* (ignored) */",
			`ignored|${context}|${this.request}`,
			`${this.request} (ignored)`
		);
		module.factoryMeta = { sideEffectFree: true };
		return module;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.request);
		write(this.userRequest);
		write(this._context);
		write(this.range);
		write(this.sourceOrder);
		write(this.weak);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		// This class reads its fields before its base class does.
		const c0 =
			/** @type {ObjectDeserializerContext<[ModuleDependency["request"], ModuleDependency["userRequest"], ModuleDependency["_context"], ModuleDependency["range"], ModuleDependency["sourceOrder"], ModuleDependency["weak"], ...ComplexSerializableType[]]>} */
			(context);
		this.request = c0.read();
		const c1 = c0.rest;
		this.userRequest = c1.read();
		const c2 = c1.rest;
		this._context = c2.read();
		const c3 = c2.rest;
		this.range = c3.read();
		const c4 = c3.rest;
		this.sourceOrder = c4.read();
		const c5 = c4.rest;
		this.weak = c5.read();
		const c6 = c5.rest;
		super.deserialize(c6);
	}
}

ModuleDependency.Template = DependencyTemplate;

/** @type {Set<keyof DependencyKinds>} */
ModuleDependency.KINDS = new Set([...Dependency.KINDS, "module-dependency"]);

module.exports = ModuleDependency;
