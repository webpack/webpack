/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import LocalModule from "./LocalModule" */
/** @import Dependency from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import { Range } from "../javascript/JavascriptParser" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[Range, Range | null, Range | null, Range | null, string | null, LocalModule | null]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[Range, Range | null, Range | null, Range | null, string | null, LocalModule | null]>} ObjectSerializerContext */

/**
 * @typedef {object} Definition
 * @property {string} definition variable declarations
 * @property {string} content replacement text
 * @property {string[]} requests runtime requirements
 */

/** @type {Map<string, Record<string, Definition>>} */
const definitionsCache = new Map();

/**
 * @param {string} moduleArgument the module argument name
 * @param {string} exportsArgument the exports argument name
 * @returns {Record<string, Definition>} definitions by branch
 */
const getDefinitions = (moduleArgument, exportsArgument) => {
	const key = `${moduleArgument} ${exportsArgument}`;
	const cached = definitionsCache.get(key);
	if (cached !== undefined) return cached;
	/** @type {Record<string, Definition>} */
	const definitions = {
		f: {
			definition: "var __WEBPACK_AMD_DEFINE_RESULT__;",
			content: `!(__WEBPACK_AMD_DEFINE_RESULT__ = (#).call(${exportsArgument}, ${RuntimeGlobals.require}, ${exportsArgument}, ${moduleArgument}),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (${moduleArgument}.exports = __WEBPACK_AMD_DEFINE_RESULT__))`,
			requests: [
				RuntimeGlobals.require,
				RuntimeGlobals.exports,
				RuntimeGlobals.module
			]
		},
		o: {
			definition: "",
			content: `!(${moduleArgument}.exports = #)`,
			requests: [RuntimeGlobals.module]
		},
		of: {
			definition:
				"var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;",
			content: `!(__WEBPACK_AMD_DEFINE_FACTORY__ = (#),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.call(${exportsArgument}, ${RuntimeGlobals.require}, ${exportsArgument}, ${moduleArgument})) :
		__WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (${moduleArgument}.exports = __WEBPACK_AMD_DEFINE_RESULT__))`,
			requests: [
				RuntimeGlobals.require,
				RuntimeGlobals.exports,
				RuntimeGlobals.module
			]
		},
		af: {
			definition:
				"var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;",
			content: `!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, __WEBPACK_AMD_DEFINE_RESULT__ = (#).apply(${exportsArgument}, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (${moduleArgument}.exports = __WEBPACK_AMD_DEFINE_RESULT__))`,
			requests: [RuntimeGlobals.exports, RuntimeGlobals.module]
		},
		ao: {
			definition: "",
			content: `!(#, ${moduleArgument}.exports = #)`,
			requests: [RuntimeGlobals.module]
		},
		aof: {
			definition:
				"var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;",
			content: `!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, __WEBPACK_AMD_DEFINE_FACTORY__ = (#),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(${exportsArgument}, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (${moduleArgument}.exports = __WEBPACK_AMD_DEFINE_RESULT__))`,
			requests: [RuntimeGlobals.exports, RuntimeGlobals.module]
		},
		lf: {
			definition: "var XXX, XXXmodule;",
			content: `!(XXXmodule = { id: YYY, exports: {}, loaded: false }, XXX = (#).call(XXXmodule.exports, ${RuntimeGlobals.require}, XXXmodule.exports, XXXmodule), XXXmodule.loaded = true, XXX === undefined && (XXX = XXXmodule.exports))`,
			requests: [RuntimeGlobals.require, RuntimeGlobals.module]
		},
		lo: {
			definition: "var XXX;",
			content: "!(XXX = #)",
			requests: []
		},
		lof: {
			definition: "var XXX, XXXfactory, XXXmodule;",
			content: `!(XXXfactory = (#), (typeof XXXfactory === 'function' ? ((XXXmodule = { id: YYY, exports: {}, loaded: false }), (XXX = XXXfactory.call(XXXmodule.exports, ${RuntimeGlobals.require}, XXXmodule.exports, XXXmodule)), (XXXmodule.loaded = true), XXX === undefined && (XXX = XXXmodule.exports)) : XXX = XXXfactory))`,
			requests: [RuntimeGlobals.require, RuntimeGlobals.module]
		},
		laf: {
			definition: "var __WEBPACK_AMD_DEFINE_ARRAY__, XXX, XXXexports;",
			content:
				"!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, XXX = (#).apply(XXXexports = {}, __WEBPACK_AMD_DEFINE_ARRAY__), XXX === undefined && (XXX = XXXexports))",
			requests: []
		},
		lao: {
			definition: "var XXX;",
			content: "!(#, XXX = #)",
			requests: []
		},
		laof: {
			definition: "var XXXarray, XXXfactory, XXXexports, XXX;",
			content: `!(XXXarray = #, XXXfactory = (#),
		(typeof XXXfactory === 'function' ?
			((XXX = XXXfactory.apply(XXXexports = {}, XXXarray)), XXX === undefined && (XXX = XXXexports)) :
			(XXX = XXXfactory)
		))`,
			requests: []
		}
	};
	definitionsCache.set(key, definitions);
	return definitions;
};

class AMDDefineDependency extends NullDependency {
	/**
	 * Creates an instance of AMDDefineDependency.
	 * @param {Range} range range
	 * @param {Range | null} arrayRange array range
	 * @param {Range | null} functionRange function range
	 * @param {Range | null} objectRange object range
	 * @param {string | null} namedModule true, when define is called with a name
	 */
	constructor(range, arrayRange, functionRange, objectRange, namedModule) {
		super();
		this.range = range;
		this.arrayRange = arrayRange;
		this.functionRange = functionRange;
		this.objectRange = objectRange;
		/** @type {string | null} */
		this.namedModule = namedModule;
		/** @type {LocalModule | null} */
		this.localModule = null;
	}

	get type() {
		return "amd define";
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.range)
			.write(this.arrayRange)
			.write(this.functionRange)
			.write(this.objectRange)
			.write(this.namedModule)
			.write(this.localModule);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.range = context.read();
		const c1 = context.rest;
		this.arrayRange = c1.read();
		const c2 = c1.rest;
		this.functionRange = c2.read();
		const c3 = c2.rest;
		this.objectRange = c3.read();
		const c4 = c3.rest;
		this.namedModule = c4.read();
		const c5 = c4.rest;
		this.localModule = c5.read();
		super.deserialize(c5.rest);
	}
}

makeSerializable(
	AMDDefineDependency,
	"webpack/lib/dependencies/AMDDefineDependency"
);

AMDDefineDependency.Template = class AMDDefineDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { module, runtimeRequirements }) {
		const dep = /** @type {AMDDefineDependency} */ (dependency);
		const branch = this.branch(dep);
		const { definition, content, requests } = getDefinitions(
			module.moduleArgument,
			module.exportsArgument
		)[branch];
		for (const req of requests) {
			runtimeRequirements.add(req);
		}
		this.replace(dep, source, definition, content);
	}

	/**
	 * Returns variable name.
	 * @param {AMDDefineDependency} dependency dependency
	 * @returns {string | false | null} variable name
	 */
	localModuleVar(dependency) {
		return (
			dependency.localModule &&
			dependency.localModule.used &&
			dependency.localModule.variableName()
		);
	}

	/**
	 * Returns branch.
	 * @param {AMDDefineDependency} dependency dependency
	 * @returns {string} branch
	 */
	branch(dependency) {
		const localModuleVar = this.localModuleVar(dependency) ? "l" : "";
		const arrayRange = dependency.arrayRange ? "a" : "";
		const objectRange = dependency.objectRange ? "o" : "";
		const functionRange = dependency.functionRange ? "f" : "";
		return localModuleVar + arrayRange + objectRange + functionRange;
	}

	/**
	 * Processes the provided dependency.
	 * @param {AMDDefineDependency} dependency dependency
	 * @param {ReplaceSource} source source
	 * @param {string} definition definition
	 * @param {string} text text
	 */
	replace(dependency, source, definition, text) {
		const localModuleVar = this.localModuleVar(dependency);
		if (localModuleVar) {
			text = text.replace(/XXX/g, localModuleVar.replace(/\$/g, "$$$$"));
			definition = definition.replace(
				/XXX/g,
				localModuleVar.replace(/\$/g, "$$$$")
			);
		}

		if (dependency.namedModule) {
			text = text.replace(/YYY/g, JSON.stringify(dependency.namedModule));
		}

		const texts = text.split("#");

		if (definition) source.insert(0, definition);

		let current = dependency.range[0];
		if (dependency.arrayRange) {
			source.replace(
				current,
				dependency.arrayRange[0] - 1,
				/** @type {string} */ (texts.shift())
			);
			current = dependency.arrayRange[1];
		}

		if (dependency.objectRange) {
			source.replace(
				current,
				dependency.objectRange[0] - 1,
				/** @type {string} */ (texts.shift())
			);
			current = dependency.objectRange[1];
		} else if (dependency.functionRange) {
			source.replace(
				current,
				dependency.functionRange[0] - 1,
				/** @type {string} */ (texts.shift())
			);
			current = dependency.functionRange[1];
		}
		source.replace(
			current,
			dependency.range[1] - 1,
			/** @type {string} */ (texts.shift())
		);
		if (texts.length > 0) throw new Error("Implementation error");
	}
};

module.exports = AMDDefineDependency;
