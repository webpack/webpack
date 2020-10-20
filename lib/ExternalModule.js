/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const ConcatenationScope = require("./ConcatenationScope");
const Module = require("./Module");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const StaticExportsDependency = require("./dependencies/StaticExportsDependency");
const extractUrlAndGlobal = require("./util/extractUrlAndGlobal");
const makeSerializable = require("./util/makeSerializable");
const propertyAccess = require("./util/propertyAccess");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("./Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/Hash")} Hash */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

/**
 * @typedef {Object} SourceData
 * @property {boolean=} iife
 * @property {string=} init
 * @property {string} expression
 */

/**
 * @param {string|string[]} variableName the variable name or path
 * @param {string} type the module system
 * @returns {SourceData} the generated source
 */
const getSourceForGlobalVariableExternal = (variableName, type) => {
	if (!Array.isArray(variableName)) {
		// make it an array as the look up works the same basically
		variableName = [variableName];
	}

	// needed for e.g. window["some"]["thing"]
	const objectLookup = variableName.map(r => `[${JSON.stringify(r)}]`).join("");
	return {
		iife: type === "this",
		expression: `${type}${objectLookup}`
	};
};

/**
 * @param {string|string[]} moduleAndSpecifiers the module request
 * @returns {SourceData} the generated source
 */
const getSourceForCommonJsExternal = moduleAndSpecifiers => {
	if (!Array.isArray(moduleAndSpecifiers)) {
		return {
			expression: `require(${JSON.stringify(moduleAndSpecifiers)});`
		};
	}
	const moduleName = moduleAndSpecifiers[0];
	return {
		expression: `require(${JSON.stringify(moduleName)})${propertyAccess(
			moduleAndSpecifiers,
			1
		)};`
	};
};

/**
 * @param {string|string[]} moduleAndSpecifiers the module request
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {SourceData} the generated source
 */
const getSourceForImportExternal = (moduleAndSpecifiers, runtimeTemplate) => {
	const importName = runtimeTemplate.outputOptions.importFunctionName;
	if (!runtimeTemplate.supportsDynamicImport() && importName === "import") {
		throw new Error(
			"The target environment doesn't support 'import()' so it's not possible to use external type 'import'"
		);
	}
	if (!Array.isArray(moduleAndSpecifiers)) {
		return {
			expression: `${importName}(${JSON.stringify(moduleAndSpecifiers)});`
		};
	}
	if (moduleAndSpecifiers.length === 1) {
		return {
			expression: `${importName}(${JSON.stringify(moduleAndSpecifiers[0])});`
		};
	}
	const moduleName = moduleAndSpecifiers[0];
	return {
		expression: `${importName}(${JSON.stringify(
			moduleName
		)}).then(${runtimeTemplate.returningFunction(
			`module${propertyAccess(moduleAndSpecifiers, 1)}`,
			"module"
		)});`
	};
};

/**
 * @param {string|string[]} urlAndGlobal the script request
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {SourceData} the generated source
 */
const getSourceForScriptExternal = (urlAndGlobal, runtimeTemplate) => {
	if (typeof urlAndGlobal === "string") {
		urlAndGlobal = extractUrlAndGlobal(urlAndGlobal);
	}
	const url = urlAndGlobal[0];
	const globalName = urlAndGlobal[1];
	return {
		init: "var error = new Error();",
		expression: `new Promise(${runtimeTemplate.basicFunction(
			"resolve, reject",
			[
				`if(typeof ${globalName} !== "undefined") return resolve();`,
				`${RuntimeGlobals.loadScript}(${JSON.stringify(
					url
				)}, ${runtimeTemplate.basicFunction("event", [
					`if(typeof ${globalName} !== "undefined") return resolve();`,
					"var errorType = event && (event.type === 'load' ? 'missing' : event.type);",
					"var realSrc = event && event.target && event.target.src;",
					"error.message = 'Loading script failed.\\n(' + errorType + ': ' + realSrc + ')';",
					"error.name = 'ScriptExternalLoadError';",
					"error.type = errorType;",
					"error.request = realSrc;",
					"reject(error);"
				])}, ${JSON.stringify(globalName)});`
			]
		)}).then(${runtimeTemplate.returningFunction(
			`${globalName}${propertyAccess(urlAndGlobal, 2)}`
		)})`
	};
};

/**
 * @param {string} variableName the variable name to check
 * @param {string} request the request path
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {string} the generated source
 */
const checkExternalVariable = (variableName, request, runtimeTemplate) => {
	return `if(typeof ${variableName} === 'undefined') { ${runtimeTemplate.throwMissingModuleErrorBlock(
		{ request }
	)} }\n`;
};

/**
 * @param {string|number} id the module id
 * @param {boolean} optional true, if the module is optional
 * @param {string|string[]} request the request path
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {SourceData} the generated source
 */
const getSourceForAmdOrUmdExternal = (
	id,
	optional,
	request,
	runtimeTemplate
) => {
	const externalVariable = `__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
		`${id}`
	)}__`;
	return {
		init: optional
			? checkExternalVariable(
					externalVariable,
					Array.isArray(request) ? request.join(".") : request,
					runtimeTemplate
			  )
			: undefined,
		expression: externalVariable
	};
};

/**
 * @param {boolean} optional true, if the module is optional
 * @param {string|string[]} request the request path
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {SourceData} the generated source
 */
const getSourceForDefaultCase = (optional, request, runtimeTemplate) => {
	if (!Array.isArray(request)) {
		// make it an array as the look up works the same basically
		request = [request];
	}

	const variableName = request[0];
	const objectLookup = propertyAccess(request, 1);
	return {
		init: optional
			? checkExternalVariable(variableName, request.join("."), runtimeTemplate)
			: undefined,
		expression: `${variableName}${objectLookup}`
	};
};

const TYPES = new Set(["javascript"]);
const RUNTIME_REQUIREMENTS = new Set([RuntimeGlobals.module]);
const RUNTIME_REQUIREMENTS_FOR_SCRIPT = new Set([
	RuntimeGlobals.module,
	RuntimeGlobals.loadScript
]);
const RUNTIME_REQUIREMENTS_CONCATENATED = new Set([]);

class ExternalModule extends Module {
	constructor(request, type, userRequest) {
		super("javascript/dynamic", null);

		// Info from Factory
		/** @type {string | string[] | Record<string, string | string[]>} */
		this.request = request;
		/** @type {string} */
		this.externalType = type;
		/** @type {string} */
		this.userRequest = userRequest;
	}

	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		return TYPES;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return this.userRequest;
	}

	/**
	 * @param {Chunk} chunk the chunk which condition should be checked
	 * @param {Compilation} compilation the compilation
	 * @returns {boolean} true, if the chunk is ok for the module
	 */
	chunkCondition(chunk, { chunkGraph }) {
		return chunkGraph.getNumberOfEntryModules(chunk) > 0;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return "external " + JSON.stringify(this.request);
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return "external " + JSON.stringify(this.request);
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		return callback(null, !this.buildMeta);
	}

	/**
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this.buildMeta = {
			async: false,
			exportsType: undefined
		};
		this.buildInfo = {
			strict: this.externalType !== "this"
		};
		this.buildMeta.exportsType = "dynamic";
		let canMangle = false;
		this.clearDependenciesAndBlocks();
		switch (this.externalType) {
			case "system":
				if (!Array.isArray(this.request) || this.request.length === 1) {
					this.buildMeta.exportsType = "namespace";
					canMangle = true;
				}
				break;
			case "promise":
				this.buildMeta.async = true;
				break;
			case "import":
				this.buildMeta.async = true;
				if (!Array.isArray(this.request) || this.request.length === 1) {
					this.buildMeta.exportsType = "namespace";
					canMangle = false;
				}
				break;
			case "script":
				this.buildMeta.async = true;
				break;
		}
		this.addDependency(new StaticExportsDependency(true, canMangle));
		callback();
	}

	/**
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason({ moduleGraph }) {
		switch (this.externalType) {
			case "amd":
			case "amd-require":
			case "umd":
			case "umd2":
			case "system":
			case "jsonp":
				return `${this.externalType} externals can't be concatenated`;
		}
		return undefined;
	}

	getSourceData(runtimeTemplate, moduleGraph, chunkGraph) {
		const request =
			typeof this.request === "object" && !Array.isArray(this.request)
				? this.request[this.externalType]
				: this.request;
		switch (this.externalType) {
			case "this":
			case "window":
			case "self":
				return getSourceForGlobalVariableExternal(request, this.externalType);
			case "global":
				return getSourceForGlobalVariableExternal(
					request,
					runtimeTemplate.outputOptions.globalObject
				);
			case "commonjs":
			case "commonjs2":
			case "commonjs-module":
				return getSourceForCommonJsExternal(request);
			case "amd":
			case "amd-require":
			case "umd":
			case "umd2":
			case "system":
			case "jsonp":
				return getSourceForAmdOrUmdExternal(
					chunkGraph.getModuleId(this),
					this.isOptional(moduleGraph),
					request,
					runtimeTemplate
				);
			case "import":
				return getSourceForImportExternal(request, runtimeTemplate);
			case "script":
				return getSourceForScriptExternal(request, runtimeTemplate);
			case "module":
				if (!runtimeTemplate.supportsEcmaScriptModuleSyntax()) {
					throw new Error(
						"The target environment doesn't support EcmaScriptModule syntax so it's not possible to use external type 'module'"
					);
				}
				throw new Error("Module external type is not implemented yet");
			case "var":
			case "promise":
			case "const":
			case "let":
			case "assign":
			default:
				return getSourceForDefaultCase(
					this.isOptional(moduleGraph),
					request,
					runtimeTemplate
				);
		}
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		concatenationScope
	}) {
		const sourceData = this.getSourceData(
			runtimeTemplate,
			moduleGraph,
			chunkGraph
		);

		let sourceString = sourceData.expression;
		if (sourceData.iife)
			sourceString = `(function() { return ${sourceString}; }())`;
		if (concatenationScope) {
			sourceString = `${runtimeTemplate.supportsConst() ? "const" : "var"} ${
				ConcatenationScope.NAMESPACE_OBJECT_EXPORT
			} = ${sourceString};`;
			concatenationScope.registerNamespaceExport(
				ConcatenationScope.NAMESPACE_OBJECT_EXPORT
			);
		} else {
			sourceString = `module.exports = ${sourceString};`;
		}
		if (sourceData.init) sourceString = `${sourceData.init}\n${sourceString}`;

		const sources = new Map();
		if (this.useSourceMap) {
			sources.set(
				"javascript",
				new OriginalSource(sourceString, this.identifier())
			);
		} else {
			sources.set("javascript", new RawSource(sourceString));
		}

		return {
			sources,
			runtimeRequirements: concatenationScope
				? RUNTIME_REQUIREMENTS_CONCATENATED
				: this.externalType === "script"
				? RUNTIME_REQUIREMENTS_FOR_SCRIPT
				: RUNTIME_REQUIREMENTS
		};
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return 42;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		const { chunkGraph } = context;
		hash.update(this.externalType);
		hash.update(JSON.stringify(this.request));
		hash.update(
			JSON.stringify(Boolean(this.isOptional(chunkGraph.moduleGraph)))
		);
		super.updateHash(hash, context);
	}

	serialize(context) {
		const { write } = context;

		write(this.request);
		write(this.externalType);
		write(this.userRequest);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.request = read();
		this.externalType = read();
		this.userRequest = read();

		super.deserialize(context);
	}
}

makeSerializable(ExternalModule, "webpack/lib/ExternalModule");

module.exports = ExternalModule;
