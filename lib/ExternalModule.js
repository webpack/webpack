/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const ConcatenationScope = require("./ConcatenationScope");
const { UsageState } = require("./ExportsInfo");
const InitFragment = require("./InitFragment");
const Module = require("./Module");
const { JAVASCRIPT_MODULE_TYPE_DYNAMIC } = require("./ModuleTypeConstants");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const StaticExportsDependency = require("./dependencies/StaticExportsDependency");
const createHash = require("./util/createHash");
const extractUrlAndGlobal = require("./util/extractUrlAndGlobal");
const makeSerializable = require("./util/makeSerializable");
const propertyAccess = require("./util/propertyAccess");
const { register } = require("./util/serialization");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./ExportsInfo")} ExportsInfo */
/** @typedef {import("./Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("./Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./NormalModuleFactory")} NormalModuleFactory */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./javascript/JavascriptModulesPlugin").ChunkRenderContext} ChunkRenderContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./util/Hash")} Hash */
/** @typedef {typeof import("./util/Hash")} HashConstructor */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @typedef {Object} SourceData
 * @property {boolean=} iife
 * @property {string=} init
 * @property {string} expression
 * @property {InitFragment<ChunkRenderContext>[]=} chunkInitFragments
 * @property {ReadonlySet<string>=} runtimeRequirements
 */

const TYPES = new Set(["javascript"]);
const CSS_TYPES = new Set(["css-import"]);
const RUNTIME_REQUIREMENTS = new Set([RuntimeGlobals.module]);
const RUNTIME_REQUIREMENTS_FOR_SCRIPT = new Set([RuntimeGlobals.loadScript]);
const RUNTIME_REQUIREMENTS_FOR_MODULE = new Set([
	RuntimeGlobals.definePropertyGetters
]);
const EMPTY_RUNTIME_REQUIREMENTS = new Set([]);

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
			expression: `require(${JSON.stringify(moduleAndSpecifiers)})`
		};
	}
	const moduleName = moduleAndSpecifiers[0];
	return {
		expression: `require(${JSON.stringify(moduleName)})${propertyAccess(
			moduleAndSpecifiers,
			1
		)}`
	};
};

/**
 * @param {string|string[]} moduleAndSpecifiers the module request
 * @returns {SourceData} the generated source
 */
const getSourceForCommonJsExternalInNodeModule = moduleAndSpecifiers => {
	const chunkInitFragments = [
		new InitFragment(
			'import { createRequire as __WEBPACK_EXTERNAL_createRequire } from "module";\n',
			InitFragment.STAGE_HARMONY_IMPORTS,
			0,
			"external module node-commonjs"
		)
	];
	if (!Array.isArray(moduleAndSpecifiers)) {
		return {
			expression: `__WEBPACK_EXTERNAL_createRequire(import.meta.url)(${JSON.stringify(
				moduleAndSpecifiers
			)})`,
			chunkInitFragments
		};
	}
	const moduleName = moduleAndSpecifiers[0];
	return {
		expression: `__WEBPACK_EXTERNAL_createRequire(import.meta.url)(${JSON.stringify(
			moduleName
		)})${propertyAccess(moduleAndSpecifiers, 1)}`,
		chunkInitFragments
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

class ModuleExternalInitFragment extends InitFragment {
	/**
	 * @param {string} request import source
	 * @param {string=} ident recomputed ident
	 * @param {string | HashConstructor=} hashFunction the hash function to use
	 */
	constructor(request, ident, hashFunction = "md4") {
		if (ident === undefined) {
			ident = Template.toIdentifier(request);
			if (ident !== request) {
				ident += `_${createHash(hashFunction)
					.update(request)
					.digest("hex")
					.slice(0, 8)}`;
			}
		}
		const identifier = `__WEBPACK_EXTERNAL_MODULE_${ident}__`;
		super(
			`import * as ${identifier} from ${JSON.stringify(request)};\n`,
			InitFragment.STAGE_HARMONY_IMPORTS,
			0,
			`external module import ${ident}`
		);
		this._ident = ident;
		this._identifier = identifier;
		this._request = request;
	}

	getNamespaceIdentifier() {
		return this._identifier;
	}
}

register(
	ModuleExternalInitFragment,
	"webpack/lib/ExternalModule",
	"ModuleExternalInitFragment",
	{
		serialize(obj, { write }) {
			write(obj._request);
			write(obj._ident);
		},
		deserialize({ read }) {
			return new ModuleExternalInitFragment(read(), read());
		}
	}
);

const generateModuleRemapping = (input, exportsInfo, runtime) => {
	if (exportsInfo.otherExportsInfo.getUsed(runtime) === UsageState.Unused) {
		const properties = [];
		for (const exportInfo of exportsInfo.orderedExports) {
			const used = exportInfo.getUsedName(exportInfo.name, runtime);
			if (!used) continue;
			const nestedInfo = exportInfo.getNestedExportsInfo();
			if (nestedInfo) {
				const nestedExpr = generateModuleRemapping(
					`${input}${propertyAccess([exportInfo.name])}`,
					nestedInfo
				);
				if (nestedExpr) {
					properties.push(`[${JSON.stringify(used)}]: y(${nestedExpr})`);
					continue;
				}
			}
			properties.push(
				`[${JSON.stringify(used)}]: () => ${input}${propertyAccess([
					exportInfo.name
				])}`
			);
		}
		return `x({ ${properties.join(", ")} })`;
	}
};

/**
 * @param {string|string[]} moduleAndSpecifiers the module request
 * @param {ExportsInfo} exportsInfo exports info of this module
 * @param {RuntimeSpec} runtime the runtime
 * @param {string | HashConstructor=} hashFunction the hash function to use
 * @returns {SourceData} the generated source
 */
const getSourceForModuleExternal = (
	moduleAndSpecifiers,
	exportsInfo,
	runtime,
	hashFunction
) => {
	if (!Array.isArray(moduleAndSpecifiers))
		moduleAndSpecifiers = [moduleAndSpecifiers];
	const initFragment = new ModuleExternalInitFragment(
		moduleAndSpecifiers[0],
		undefined,
		hashFunction
	);
	const baseAccess = `${initFragment.getNamespaceIdentifier()}${propertyAccess(
		moduleAndSpecifiers,
		1
	)}`;
	const moduleRemapping = generateModuleRemapping(
		baseAccess,
		exportsInfo,
		runtime
	);
	let expression = moduleRemapping || baseAccess;
	return {
		expression,
		init: `var x = y => { var x = {}; ${RuntimeGlobals.definePropertyGetters}(x, y); return x; }\nvar y = x => () => x`,
		runtimeRequirements: moduleRemapping
			? RUNTIME_REQUIREMENTS_FOR_MODULE
			: undefined,
		chunkInitFragments: [initFragment]
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
		init: "var __webpack_error__ = new Error();",
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
					"__webpack_error__.message = 'Loading script failed.\\n(' + errorType + ': ' + realSrc + ')';",
					"__webpack_error__.name = 'ScriptExternalLoadError';",
					"__webpack_error__.type = errorType;",
					"__webpack_error__.request = realSrc;",
					"reject(__webpack_error__);"
				])}, ${JSON.stringify(globalName)});`
			]
		)}).then(${runtimeTemplate.returningFunction(
			`${globalName}${propertyAccess(urlAndGlobal, 2)}`
		)})`,
		runtimeRequirements: RUNTIME_REQUIREMENTS_FOR_SCRIPT
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

class ExternalModule extends Module {
	constructor(request, type, userRequest) {
		super(JAVASCRIPT_MODULE_TYPE_DYNAMIC, null);

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
		return this.externalType === "css-import" ? CSS_TYPES : TYPES;
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
		return this.externalType === "css-import"
			? true
			: chunkGraph.getNumberOfEntryModules(chunk) > 0;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `external ${this.externalType} ${JSON.stringify(this.request)}`;
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
	 * @param {function((WebpackError | null)=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
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
			strict: true,
			topLevelDeclarations: new Set(),
			module: compilation.outputOptions.module
		};
		const { request, externalType } = this._getRequestAndExternalType();
		this.buildMeta.exportsType = "dynamic";
		let canMangle = false;
		this.clearDependenciesAndBlocks();
		switch (externalType) {
			case "this":
				this.buildInfo.strict = false;
				break;
			case "system":
				if (!Array.isArray(request) || request.length === 1) {
					this.buildMeta.exportsType = "namespace";
					canMangle = true;
				}
				break;
			case "module":
				if (this.buildInfo.module) {
					if (!Array.isArray(request) || request.length === 1) {
						this.buildMeta.exportsType = "namespace";
						canMangle = true;
					}
				} else {
					this.buildMeta.async = true;
					if (!Array.isArray(request) || request.length === 1) {
						this.buildMeta.exportsType = "namespace";
						canMangle = false;
					}
				}
				break;
			case "script":
			case "promise":
				this.buildMeta.async = true;
				break;
			case "import":
				this.buildMeta.async = true;
				if (!Array.isArray(request) || request.length === 1) {
					this.buildMeta.exportsType = "namespace";
					canMangle = false;
				}
				break;
		}
		this.addDependency(new StaticExportsDependency(true, canMangle));
		callback();
	}

	restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory) {
		this._restoreFromUnsafeCache(unsafeCacheData, normalModuleFactory);
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

	_getRequestAndExternalType() {
		let { request, externalType } = this;
		if (typeof request === "object" && !Array.isArray(request))
			request = request[externalType];
		return { request, externalType };
	}

	_getSourceData(
		request,
		externalType,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		runtime
	) {
		switch (externalType) {
			case "this":
			case "window":
			case "self":
				return getSourceForGlobalVariableExternal(request, this.externalType);
			case "global":
				return getSourceForGlobalVariableExternal(
					request,
					runtimeTemplate.globalObject
				);
			case "commonjs":
			case "commonjs2":
			case "commonjs-module":
			case "commonjs-static":
				return getSourceForCommonJsExternal(request);
			case "node-commonjs":
				return this.buildInfo.module
					? getSourceForCommonJsExternalInNodeModule(request)
					: getSourceForCommonJsExternal(request);
			case "amd":
			case "amd-require":
			case "umd":
			case "umd2":
			case "system":
			case "jsonp": {
				const id = chunkGraph.getModuleId(this);
				return getSourceForAmdOrUmdExternal(
					id !== null ? id : this.identifier(),
					this.isOptional(moduleGraph),
					request,
					runtimeTemplate
				);
			}
			case "import":
				return getSourceForImportExternal(request, runtimeTemplate);
			case "script":
				return getSourceForScriptExternal(request, runtimeTemplate);
			case "module": {
				if (!this.buildInfo.module) {
					if (!runtimeTemplate.supportsDynamicImport()) {
						throw new Error(
							"The target environment doesn't support dynamic import() syntax so it's not possible to use external type 'module' within a script" +
								(runtimeTemplate.supportsEcmaScriptModuleSyntax()
									? "\nDid you mean to build a EcmaScript Module ('output.module: true')?"
									: "")
						);
					}
					return getSourceForImportExternal(request, runtimeTemplate);
				}
				if (!runtimeTemplate.supportsEcmaScriptModuleSyntax()) {
					throw new Error(
						"The target environment doesn't support EcmaScriptModule syntax so it's not possible to use external type 'module'"
					);
				}
				return getSourceForModuleExternal(
					request,
					moduleGraph.getExportsInfo(this),
					runtime,
					runtimeTemplate.outputOptions.hashFunction
				);
			}
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
		runtime,
		concatenationScope
	}) {
		const { request, externalType } = this._getRequestAndExternalType();
		switch (externalType) {
			case "asset": {
				const sources = new Map();
				sources.set(
					"javascript",
					new RawSource(`module.exports = ${JSON.stringify(request)};`)
				);
				const data = new Map();
				data.set("url", request);
				return { sources, runtimeRequirements: RUNTIME_REQUIREMENTS, data };
			}
			case "css-import": {
				const sources = new Map();
				sources.set(
					"css-import",
					new RawSource(`@import url(${JSON.stringify(request)});`)
				);
				return {
					sources,
					runtimeRequirements: EMPTY_RUNTIME_REQUIREMENTS
				};
			}
			default: {
				const sourceData = this._getSourceData(
					request,
					externalType,
					runtimeTemplate,
					moduleGraph,
					chunkGraph,
					runtime
				);

				let sourceString = sourceData.expression;
				if (sourceData.iife)
					sourceString = `(function() { return ${sourceString}; }())`;
				if (concatenationScope) {
					sourceString = `${
						runtimeTemplate.supportsConst() ? "const" : "var"
					} ${ConcatenationScope.NAMESPACE_OBJECT_EXPORT} = ${sourceString};`;
					concatenationScope.registerNamespaceExport(
						ConcatenationScope.NAMESPACE_OBJECT_EXPORT
					);
				} else {
					sourceString = `module.exports = ${sourceString};`;
				}
				if (sourceData.init)
					sourceString = `${sourceData.init}\n${sourceString}`;

				let data = undefined;
				if (sourceData.chunkInitFragments) {
					data = new Map();
					data.set("chunkInitFragments", sourceData.chunkInitFragments);
				}

				const sources = new Map();
				if (this.useSourceMap || this.useSimpleSourceMap) {
					sources.set(
						"javascript",
						new OriginalSource(sourceString, this.identifier())
					);
				} else {
					sources.set("javascript", new RawSource(sourceString));
				}

				let runtimeRequirements = sourceData.runtimeRequirements;
				if (!concatenationScope) {
					if (!runtimeRequirements) {
						runtimeRequirements = RUNTIME_REQUIREMENTS;
					} else {
						const set = new Set(runtimeRequirements);
						set.add(RuntimeGlobals.module);
						runtimeRequirements = set;
					}
				}

				return {
					sources,
					runtimeRequirements:
						runtimeRequirements || EMPTY_RUNTIME_REQUIREMENTS,
					data
				};
			}
		}
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
		hash.update(
			`${this.externalType}${JSON.stringify(this.request)}${this.isOptional(
				chunkGraph.moduleGraph
			)}`
		);
		super.updateHash(hash, context);
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;

		write(this.request);
		write(this.externalType);
		write(this.userRequest);

		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
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
