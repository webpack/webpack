/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const isDependencyKind = require("../../graph/isDependencyKind");
const ModuleDependency = require("../core/ModuleDependency");

/** @import Module from "../../module/Module" */
/** @import DependenciesBlock from "../../graph/DependenciesBlock" */
/** @import JavascriptParser, { ImportAttributes, JavascriptParserState } from "../../javascript/JavascriptParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[ImportAttributes | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[ImportAttributes | undefined]>} ObjectSerializerContext */

const PLUGIN_NAME = "HotModuleDependency";

/** @type {WeakMap<JavascriptParserState, (ModuleDependency & { request: string, attributes?: ImportAttributes })[]>} */
const pendingByState = new WeakMap();
/** @type {WeakSet<JavascriptParser>} */
const tappedParsers = new WeakSet();

/**
 * @param {ImportAttributes | undefined} attributes import attributes
 * @returns {string} the attributes, the same for any key order
 */
const attributesKey = (attributes) =>
	attributes
		? JSON.stringify(
				Object.keys(attributes)
					.sort()
					.map((key) => [key, attributes[key]])
			)
		: "";

/**
 * The attributes the module's imports of a request share, static and dynamic.
 * @param {DependenciesBlock} block the module or one of its blocks
 * @param {string} request the request
 * @param {{ found: boolean, key: string, attributes: ImportAttributes | undefined }} state what was found
 * @returns {boolean} false when two imports differ
 */
const collectImportAttributes = (block, request, state) => {
	for (const dependency of block.dependencies) {
		if (
			!isDependencyKind(dependency, "esm-side-effect-import") &&
			!isDependencyKind(dependency, "dynamic-import")
		) {
			continue;
		}
		if (/** @type {ModuleDependency} */ (dependency).request !== request) {
			continue;
		}
		const attributes =
			/** @type {ModuleDependency & { attributes?: ImportAttributes }} */
			(dependency).attributes;
		const key = attributesKey(attributes);
		if (!state.found) {
			state.found = true;
			state.key = key;
			state.attributes = attributes;
		} else if (key !== state.key) {
			return false;
		}
	}
	for (const child of block.blocks) {
		if (!collectImportAttributes(child, request, state)) return false;
	}
	return true;
};

/**
 * The attributes a module's imports of a request share, so an accept of it
 * names the module they import; undefined when there are none or they differ.
 * @param {Module} module the accepting module
 * @param {string} request the accepted request
 * @returns {ImportAttributes | undefined} the attributes
 */
const getImportAttributes = (module, request) => {
	const state = { found: false, key: "", attributes: undefined };
	return collectImportAttributes(module, request, state)
		? state.attributes
		: undefined;
};

/**
 * A request of `module.hot.accept` or `decline`, which names the module the
 * accepting module imports, attributes included.
 */
class HotModuleDependency extends ModuleDependency {
	/**
	 * Creates an instance of HotModuleDependency.
	 * @param {string} request the request string
	 * @param {number=} sourceOrder source order
	 */
	constructor(request, sourceOrder) {
		super(request, sourceOrder);
		/** @type {ImportAttributes | undefined} */
		this.attributes = undefined;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		const identifier = super.getResourceIdentifier();
		return this.attributes
			? `${identifier}|attributes${JSON.stringify(this.attributes)}`
			: identifier;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.attributes);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.attributes = context.read();
		super.deserialize(context.rest);
	}

	/**
	 * Sets the attributes of a request once the module is parsed, as the
	 * accepting module imports it, so an `import()` after the call counts too.
	 * @param {JavascriptParser} parser the parser
	 * @param {ModuleDependency & { request: string, attributes?: ImportAttributes }} dependency the hot request
	 * @returns {void}
	 */
	static setImportAttributesOnFinish(parser, dependency) {
		let pending = pendingByState.get(parser.state);
		if (pending === undefined) {
			pending = [];
			pendingByState.set(parser.state, pending);
		}
		pending.push(dependency);
		if (tappedParsers.has(parser)) return;
		tappedParsers.add(parser);
		parser.hooks.finish.tap({ name: PLUGIN_NAME, path: true }, () => {
			const dependencies = pendingByState.get(parser.state);
			if (dependencies === undefined) return;
			pendingByState.delete(parser.state);
			for (const dep of dependencies) {
				dep.attributes = getImportAttributes(parser.state.module, dep.request);
			}
		});
	}
}

module.exports = HotModuleDependency;
