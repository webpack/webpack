/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, OriginalSource } = require("webpack-sources");
const ExternalModule = require("../ExternalModule");
const Template = require("../Template");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");

/** @import { Source } from "webpack-sources" */
/**
 * @import {
 * 	LibraryCustomUmdCommentObject,
 * 	LibraryCustomUmdObject,
 * 	LibraryName,
 * 	LibraryOptions,
 * 	LibraryType
 * } from "../../declarations/WebpackOptions"
 */
/** @import { RenderContext } from "../javascript/JavascriptModulesPlugin" */
/** @import { RequestRecord } from "../ExternalModule" */

/**
 * Defines the shared type used by this module.
 * @template T
 * @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T>
 */

/**
 * Accessor to object access.
 * @param {string[]} accessor the accessor to convert to path
 * @returns {string} the path
 */
const accessorToObjectAccess = (accessor) =>
	accessor.map((a) => `[${JSON.stringify(a)}]`).join("");

/** @typedef {string | string[]} Accessor */

/**
 * Returns the path.
 * @param {string | undefined} base the path prefix
 * @param {Accessor} accessor the accessor
 * @param {string=} joinWith the element separator
 * @returns {string} the path
 */
const accessorAccess = (base, accessor, joinWith = ", ") => {
	const accessors = Array.isArray(accessor) ? accessor : [accessor];
	return accessors
		.map((_, idx) => {
			const a = base
				? base + accessorToObjectAccess(accessors.slice(0, idx + 1))
				: accessors[0] + accessorToObjectAccess(accessors.slice(1, idx + 1));
			if (idx === accessors.length - 1) return a;
			if (idx === 0 && base === undefined) {
				return `${a} = typeof ${a} === "object" ? ${a} : {}`;
			}
			return `${a} = ${a} || {}`;
		})
		.join(joinWith);
};

/**
 * Builds the guard for an AMD-style loader on a container object, e.g. `sap.ui` becomes
 * `typeof sap !== 'undefined' && sap.ui && typeof sap.ui.define === 'function'`. The path is
 * walked step by step because `typeof sap.ui` alone throws when `sap` is undeclared, which is
 * exactly when the branch has to be skipped.
 * @param {string} container the container object holding `define`
 * @returns {string} the condition
 */
const amdContainerCondition = (container) => {
	const path = container.split(".");
	const conditions = [`typeof ${path[0]} !== 'undefined'`];
	for (let i = 1; i < path.length; i++) {
		conditions.push(path.slice(0, i + 1).join("."));
	}
	conditions.push(`typeof ${container}.define === 'function'`);
	return conditions.join(" && ");
};

/**
 * Defines the umd library plugin options type used by this module.
 * @typedef {object} UmdLibraryPluginOptions
 * @property {LibraryType} type
 * @property {boolean=} optionalAmdExternalAsGlobal
 */

/**
 * Defines the umd library plugin parsed type used by this module.
 * @typedef {object} UmdLibraryPluginParsed
 * @property {string | string[] | undefined} name
 * @property {LibraryCustomUmdObject} names
 * @property {string | LibraryCustomUmdCommentObject | undefined} auxiliaryComment
 * @property {boolean | undefined} namedDefine
 * @property {string | undefined} amdContainer
 */

/**
 * Represents the umd library plugin runtime component.
 * @typedef {UmdLibraryPluginParsed} T
 * @extends {AbstractLibraryPlugin<UmdLibraryPluginParsed>}
 */
class UmdLibraryPlugin extends AbstractLibraryPlugin {
	/**
	 * Creates an instance of UmdLibraryPlugin.
	 * @param {UmdLibraryPluginOptions} options the plugin option
	 */
	constructor(options) {
		super({
			pluginName: "UmdLibraryPlugin",
			type: options.type
		});

		/** @type {UmdLibraryPluginOptions["optionalAmdExternalAsGlobal"]} */
		this.optionalAmdExternalAsGlobal = options.optionalAmdExternalAsGlobal;
	}

	/**
	 * Returns preprocess as needed by overriding.
	 * @param {LibraryOptions} library normalized library option
	 * @returns {T} preprocess as needed by overriding
	 */
	parseOptions(library) {
		/** @type {LibraryName | undefined} */
		let name;
		/** @type {LibraryCustomUmdObject} */
		let names;
		if (typeof library.name === "object" && !Array.isArray(library.name)) {
			name = library.name.root || library.name.amd || library.name.commonjs;
			names = library.name;
		} else {
			name = library.name;
			const singleName = Array.isArray(name) ? name[0] : name;
			names = {
				commonjs: singleName,
				root: library.name,
				amd: singleName
			};
		}
		return {
			name,
			names,
			auxiliaryComment: library.auxiliaryComment,
			namedDefine: library.umdNamedDefine,
			amdContainer: library.umdAmdContainer
		};
	}

	/**
	 * Returns source with library export.
	 * @param {Source} source source
	 * @param {RenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {Source} source with library export
	 */
	render(
		source,
		{ chunkGraph, runtimeTemplate, chunk, moduleGraph },
		{ options, compilation }
	) {
		const modules = chunkGraph
			.getChunkModules(chunk)
			.filter(
				(m) =>
					m instanceof ExternalModule &&
					(m.externalType === "umd" || m.externalType === "umd2")
			);
		let externals = /** @type {ExternalModule[]} */ (modules);
		/** @type {ExternalModule[]} */
		const optionalExternals = [];
		/** @type {ExternalModule[]} */
		let requiredExternals = [];
		if (this.optionalAmdExternalAsGlobal) {
			for (const m of externals) {
				if (m.isOptional(moduleGraph)) {
					optionalExternals.push(m);
				} else {
					requiredExternals.push(m);
				}
			}
			externals = [...requiredExternals, ...optionalExternals];
		} else {
			requiredExternals = externals;
		}

		/**
		 * Returns the replaced keys.
		 * @param {string} str the string to replace
		 * @returns {string} the replaced keys
		 */
		const replaceKeys = (str) =>
			compilation.getPath(str, {
				chunk
			});

		/**
		 * Externals deps array.
		 * @param {ExternalModule[]} modules external modules
		 * @returns {string} result
		 */
		const externalsDepsArray = (modules) =>
			`[${replaceKeys(
				modules
					.map((m) =>
						JSON.stringify(
							typeof m.request === "object"
								? /** @type {RequestRecord} */
									(m.request).amd
								: m.request
						)
					)
					.join(", ")
			)}]`;

		/**
		 * Externals root array.
		 * @param {ExternalModule[]} modules external modules
		 * @returns {string} result
		 */
		const externalsRootArray = (modules) =>
			replaceKeys(
				modules
					.map((m) => {
						let request = m.request;
						if (typeof request === "object") {
							request =
								/** @type {RequestRecord} */
								(request).root;
						}
						return `root${accessorToObjectAccess([
							...(Array.isArray(request) ? request : [request])
						])}`;
					})
					.join(", ")
			);

		/**
		 * Externals require array.
		 * @param {string} type the type
		 * @returns {string} external require array
		 */
		const externalsRequireArray = (type) =>
			replaceKeys(
				externals
					.map((m) => {
						let request = m.request;
						if (typeof request === "object") {
							request =
								/** @type {RequestRecord} */
								(request)[type];
						}
						if (request === undefined) {
							throw new Error(
								`Missing external configuration for type:${type}`
							);
						}
						let expr = Array.isArray(request)
							? `require(${JSON.stringify(request[0])})${accessorToObjectAccess(
									request.slice(1)
								)}`
							: `require(${JSON.stringify(request)})`;
						if (m.isOptional(moduleGraph)) {
							expr = `(function webpackLoadOptionalExternalModule() { try { return ${expr}; } catch(e) {} }())`;
						}
						return expr;
					})
					.join(", ")
			);

		/**
		 * Externals arguments.
		 * @param {ExternalModule[]} modules external modules
		 * @returns {string} arguments
		 */
		const externalsArguments = (modules) =>
			modules
				.map(
					(m) =>
						`__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
							`${chunkGraph.getModuleId(m)}`
						)}__`
				)
				.join(", ");

		/**
		 * Returns stringified library name.
		 * @param {Accessor} library library name
		 * @returns {string} stringified library name
		 */
		const libraryName = (library) =>
			JSON.stringify(
				replaceKeys(
					/** @type {string} */
					([...(Array.isArray(library) ? library : [library])].pop())
				)
			);

		/** @type {string} */
		let amdFactory;
		if (optionalExternals.length > 0) {
			const wrapperArguments = externalsArguments(requiredExternals);
			const factoryArguments =
				requiredExternals.length > 0
					? `${externalsArguments(requiredExternals)}, ${externalsRootArray(
							optionalExternals
						)}`
					: externalsRootArray(optionalExternals);
			amdFactory =
				`function webpackLoadOptionalExternalModuleAmd(${wrapperArguments}) {\n` +
				`			return factory(${factoryArguments});\n` +
				"		}";
		} else {
			amdFactory = "factory";
		}

		const { amdContainer, auxiliaryComment, namedDefine, names } = options;

		/**
		 * Returns a call to an AMD-style define function.
		 * @param {string} defineFunction the define function to call
		 * @returns {string} the define call
		 */
		const defineCall = (defineFunction) => {
			const deps =
				requiredExternals.length > 0
					? externalsDepsArray(requiredExternals)
					: "[]";
			return names.amd && namedDefine === true
				? `		${defineFunction}(${libraryName(
						names.amd
					)}, ${deps}, ${amdFactory});\n`
				: `		${defineFunction}(${deps}, ${amdFactory});\n`;
		};

		/**
		 * Gets auxiliary comment.
		 * @param {keyof LibraryCustomUmdCommentObject} type type
		 * @returns {string} comment
		 */
		const getAuxiliaryComment = (type) => {
			if (auxiliaryComment) {
				if (typeof auxiliaryComment === "string") {
					return `\t//${auxiliaryComment}\n`;
				}
				if (auxiliaryComment[type]) return `\t//${auxiliaryComment[type]}\n`;
			}
			return "";
		};

		return new ConcatSource(
			new OriginalSource(
				`(function webpackUniversalModuleDefinition(root, factory) {\n${getAuxiliaryComment(
					"commonjs2"
				)}	if(typeof exports === 'object' && typeof module === 'object')\n` +
					`		module.exports = factory(${externalsRequireArray(
						"commonjs2"
					)});\n${getAuxiliaryComment(
						"amd"
					)}	else if(typeof define === 'function' && define.amd)\n${defineCall(
						"define"
					)}${
						amdContainer
							? `	else if(${amdContainerCondition(
									amdContainer
								)})\n${defineCall(`${amdContainer}.define`)}`
							: ""
					}${
						names.root || names.commonjs
							? `${getAuxiliaryComment(
									"commonjs"
								)}	else if(typeof exports === 'object')\n` +
								`		exports[${libraryName(
									/** @type {Accessor} */
									(names.commonjs || names.root)
								)}] = factory(${externalsRequireArray(
									"commonjs"
								)});\n${getAuxiliaryComment("root")}	else\n` +
								`		${replaceKeys(
									accessorAccess(
										"root",
										/** @type {Accessor} */
										(names.root || names.commonjs)
									)
								)} = factory(${externalsRootArray(externals)});\n`
							: `	else {\n${
									externals.length > 0
										? `		var a = typeof exports === 'object' ? factory(${externalsRequireArray(
												"commonjs"
											)}) : factory(${externalsRootArray(externals)});\n`
										: "		var a = factory();\n"
								}		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];\n` +
								"	}\n"
					}})(${runtimeTemplate.globalObject}, ${
						runtimeTemplate.supportsArrowFunction()
							? `(${externalsArguments(externals)}) =>`
							: `function(${externalsArguments(externals)})`
					} {\nreturn `,
				"webpack/universalModuleDefinition"
			),
			source,
			";\n})"
		);
	}
}

module.exports = UmdLibraryPlugin;
