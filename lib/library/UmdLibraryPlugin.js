/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, OriginalSource } = require("webpack-sources");
const ExternalModule = require("../ExternalModule");
const Template = require("../Template");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").LibraryCustomUmdCommentObject} LibraryCustomUmdCommentObject */
/** @typedef {import("../../declarations/WebpackOptions").LibraryCustomUmdObject} LibraryCustomUmdObject */
/** @typedef {import("../../declarations/WebpackOptions").LibraryName} LibraryName */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../javascript/JavascriptModulesPlugin").RenderContext} RenderContext */
/** @typedef {import("../util/Hash")} Hash */
/** @template T @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T> */

/**
 * @param {string[]} accessor the accessor to convert to path
 * @returns {string} the path
 */
const accessorToObjectAccess = accessor => {
	return accessor.map(a => `[${JSON.stringify(a)}]`).join("");
};

/**
 * @param {string|undefined} base the path prefix
 * @param {string|string[]} accessor the accessor
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
			if (idx === 0 && base === undefined)
				return `${a} = typeof ${a} === "object" ? ${a} : {}`;
			return `${a} = ${a} || {}`;
		})
		.join(joinWith);
};

/** @typedef {string | string[] | LibraryCustomUmdObject} UmdLibraryPluginName */

/**
 * @typedef {Object} UmdLibraryPluginOptions
 * @property {LibraryType} type
 * @property {boolean=} optionalAmdExternalAsGlobal
 */

/**
 * @typedef {Object} UmdLibraryPluginParsed
 * @property {string | string[]} name
 * @property {LibraryCustomUmdObject} names
 * @property {string | LibraryCustomUmdCommentObject} auxiliaryComment
 * @property {boolean} namedDefine
 */

/**
 * @typedef {UmdLibraryPluginParsed} T
 * @extends {AbstractLibraryPlugin<UmdLibraryPluginParsed>}
 */
class UmdLibraryPlugin extends AbstractLibraryPlugin {
	/**
	 * @param {UmdLibraryPluginOptions} options the plugin option
	 */
	constructor(options) {
		super({
			pluginName: "UmdLibraryPlugin",
			type: options.type
		});

		this.optionalAmdExternalAsGlobal = options.optionalAmdExternalAsGlobal;
	}

	/**
	 * @param {LibraryOptions} library normalized library option
	 * @returns {T | false} preprocess as needed by overriding
	 */
	parseOptions(library) {
		/** @type {LibraryName} */
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
			namedDefine: library.umdNamedDefine
		};
	}

	/**
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
				m =>
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
			externals = requiredExternals.concat(optionalExternals);
		} else {
			requiredExternals = externals;
		}

		const replaceKeys = str => {
			return compilation.getPath(str, {
				chunk
			});
		};

		const externalsDepsArray = modules => {
			return `[${replaceKeys(
				modules
					.map(m =>
						JSON.stringify(
							typeof m.request === "object" ? m.request.amd : m.request
						)
					)
					.join(", ")
			)}]`;
		};

		const externalsRootArray = modules => {
			return replaceKeys(
				modules
					.map(m => {
						let request = m.request;
						if (typeof request === "object") request = request.root;
						return `root${accessorToObjectAccess([].concat(request))}`;
					})
					.join(", ")
			);
		};

		const externalsRequireArray = type => {
			return replaceKeys(
				externals
					.map(m => {
						let expr;
						let request = m.request;
						if (typeof request === "object") {
							request = request[type];
						}
						if (request === undefined) {
							throw new Error(
								"Missing external configuration for type:" + type
							);
						}
						if (Array.isArray(request)) {
							expr = `require(${JSON.stringify(
								request[0]
							)})${accessorToObjectAccess(request.slice(1))}`;
						} else {
							expr = `require(${JSON.stringify(request)})`;
						}
						if (m.isOptional(moduleGraph)) {
							expr = `(function webpackLoadOptionalExternalModule() { try { return ${expr}; } catch(e) {} }())`;
						}
						return expr;
					})
					.join(", ")
			);
		};

		const externalsArguments = modules => {
			return modules
				.map(
					m =>
						`__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
							`${chunkGraph.getModuleId(m)}`
						)}__`
				)
				.join(", ");
		};

		const libraryName = library => {
			return JSON.stringify(replaceKeys([].concat(library).pop()));
		};

		let amdFactory;
		if (optionalExternals.length > 0) {
			const wrapperArguments = externalsArguments(requiredExternals);
			const factoryArguments =
				requiredExternals.length > 0
					? externalsArguments(requiredExternals) +
					  ", " +
					  externalsRootArray(optionalExternals)
					: externalsRootArray(optionalExternals);
			amdFactory =
				`function webpackLoadOptionalExternalModuleAmd(${wrapperArguments}) {\n` +
				`			return factory(${factoryArguments});\n` +
				"		}";
		} else {
			amdFactory = "factory";
		}

		const { auxiliaryComment, namedDefine, names } = options;

		const getAuxiliaryComment = type => {
			if (auxiliaryComment) {
				if (typeof auxiliaryComment === "string")
					return "\t//" + auxiliaryComment + "\n";
				if (auxiliaryComment[type])
					return "\t//" + auxiliaryComment[type] + "\n";
			}
			return "";
		};

		return new ConcatSource(
			new OriginalSource(
				"(function webpackUniversalModuleDefinition(root, factory) {\n" +
					getAuxiliaryComment("commonjs2") +
					"	if(typeof exports === 'object' && typeof module === 'object')\n" +
					"		module.exports = factory(" +
					externalsRequireArray("commonjs2") +
					");\n" +
					getAuxiliaryComment("amd") +
					"	else if(typeof define === 'function' && define.amd)\n" +
					(requiredExternals.length > 0
						? names.amd && namedDefine === true
							? "		define(" +
							  libraryName(names.amd) +
							  ", " +
							  externalsDepsArray(requiredExternals) +
							  ", " +
							  amdFactory +
							  ");\n"
							: "		define(" +
							  externalsDepsArray(requiredExternals) +
							  ", " +
							  amdFactory +
							  ");\n"
						: names.amd && namedDefine === true
						? "		define(" +
						  libraryName(names.amd) +
						  ", [], " +
						  amdFactory +
						  ");\n"
						: "		define([], " + amdFactory + ");\n") +
					(names.root || names.commonjs
						? getAuxiliaryComment("commonjs") +
						  "	else if(typeof exports === 'object')\n" +
						  "		exports[" +
						  libraryName(names.commonjs || names.root) +
						  "] = factory(" +
						  externalsRequireArray("commonjs") +
						  ");\n" +
						  getAuxiliaryComment("root") +
						  "	else\n" +
						  "		" +
						  replaceKeys(
								accessorAccess("root", names.root || names.commonjs)
						  ) +
						  " = factory(" +
						  externalsRootArray(externals) +
						  ");\n"
						: "	else {\n" +
						  (externals.length > 0
								? "		var a = typeof exports === 'object' ? factory(" +
								  externalsRequireArray("commonjs") +
								  ") : factory(" +
								  externalsRootArray(externals) +
								  ");\n"
								: "		var a = factory();\n") +
						  "		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];\n" +
						  "	}\n") +
					`})(${
						runtimeTemplate.outputOptions.globalObject
					}, function(${externalsArguments(externals)}) {\nreturn `,
				"webpack/universalModuleDefinition"
			),
			source,
			";\n})"
		);
	}
}

module.exports = UmdLibraryPlugin;
