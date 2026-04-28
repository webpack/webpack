/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { RawSource } = require("webpack-sources");
const { JAVASCRIPT_TYPES } = require("../ModuleSourceTypeConstants");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildCallback} BuildCallback */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").Sources} Sources */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */
/** @typedef {import("../dependencies/ImportPhase").ImportPhaseName} ImportPhaseName */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

class JsSourcePhaseModule extends NormalModule {
	/**
	 * @param {NormalModuleCreateData & { phase: ImportPhaseName | undefined }} options options object
	 */
	constructor(options) {
		super(options);
		this.phase = options.phase;
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		let str = super.identifier();
		if (this.phase) {
			str = `${str}|${this.phase}`;
		}
		return str;
	}

	/**
	 * Returns the source types this module can generate.
	 * @returns {SourceTypes} types available (do not mutate)
	 */
	getSourceTypes() {
		return JAVASCRIPT_TYPES;
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		super.updateCacheModule(module);
		const m = /** @type {JsSourcePhaseModule} */ (module);
		this.phase = m.phase;
	}

	/**
	 * Builds the module using the provided compilation context.
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {BuildCallback} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		const self = /** @type {JsSourcePhaseModule & EXPECTED_ANY} */ (this);
		self._forceBuild = false;
		self._source = null;
		if (self._sourceSizes !== undefined) self._sourceSizes.clear();
		self._sourceTypes = undefined;
		self._ast = null;
		self.error = null;
		self.clearWarningsAndErrors();
		self.clearDependenciesAndBlocks();

		self.buildMeta = /** @type {BuildMeta} */ ({
			exportsType: "namespace",
			strictHarmonyModule: true
		});
		self.buildInfo = /** @type {BuildInfo} */ ({
			cacheable: true,
			parsed: true,
			strict: true,
			fileDependencies: undefined,
			contextDependencies: undefined,
			missingDependencies: undefined,
			buildDependencies: undefined,
			valueDependencies: undefined,
			hash: undefined,
			assets: undefined,
			assetsInfo: undefined
		});

		self.addDependency(new StaticExportsDependency(["default"], false));

		self._initBuildHash(compilation);
		self._lastSuccessfulBuildMeta = self.buildMeta;
		return callback();
	}

	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ runtimeTemplate }) {
		/** @type {Set<string>} */
		const runtimeRequirements = new Set();
		runtimeRequirements.add(RuntimeGlobals.exports);
		runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);

		const source = new RawSource(
			Template.asString([
				'var __webpack_module_source__ = Object.freeze(Object.create(null, { [Symbol.toStringTag]: { value: "Module" } }));',
				`${RuntimeGlobals.definePropertyGetters}(${this.exportsArgument}, { "default": ${runtimeTemplate.returningFunction(
					"__webpack_module_source__"
				)} });`
			])
		);

		/** @type {Sources} */
		const sources = new Map();
		sources.set("javascript", source);

		return {
			sources,
			runtimeRequirements
		};
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.phase);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {JsSourcePhaseModule} the deserialized object
	 */
	static deserialize(context) {
		const obj = new JsSourcePhaseModule({
			// will be deserialized by Module
			layer: /** @type {EXPECTED_ANY} */ (null),
			type: "",
			// will be filled by updateCacheModule
			resource: "",
			context: "",
			request: /** @type {EXPECTED_ANY} */ (null),
			userRequest: /** @type {EXPECTED_ANY} */ (null),
			rawRequest: /** @type {EXPECTED_ANY} */ (null),
			loaders: /** @type {EXPECTED_ANY} */ (null),
			matchResource: /** @type {EXPECTED_ANY} */ (null),
			parser: /** @type {EXPECTED_ANY} */ (null),
			parserOptions: /** @type {EXPECTED_ANY} */ (null),
			generator: /** @type {EXPECTED_ANY} */ (null),
			generatorOptions: /** @type {EXPECTED_ANY} */ (null),
			resolveOptions: /** @type {EXPECTED_ANY} */ (null),
			extractSourceMap: /** @type {EXPECTED_ANY} */ (null),
			phase: /** @type {EXPECTED_ANY} */ (null)
		});
		obj.deserialize(context);
		return obj;
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.phase = read();
		super.deserialize(context);
	}
}

makeSerializable(
	JsSourcePhaseModule,
	"webpack/lib/javascript/JsSourcePhaseModule"
);

const PLUGIN_NAME = "JsSourcePhaseModulesPlugin";

const JS_TYPES = [
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
];

class JsSourcePhaseModulesPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(_compilation, { normalModuleFactory }) => {
				for (const type of JS_TYPES) {
					normalModuleFactory.hooks.createModuleClass
						.for(type)
						.tap(PLUGIN_NAME, (createData, resolveData) => {
							if (resolveData.phase !== "source") return;
							return new JsSourcePhaseModule({
								.../** @type {NormalModuleCreateData & { type: string }} */
								(createData),
								phase: resolveData.phase
							});
						});
				}
			}
		);
	}
}

module.exports = JsSourcePhaseModulesPlugin;
module.exports.JsSourcePhaseModule = JsSourcePhaseModule;
