/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SetVarTemplatePlugin = require("./SetVarTemplatePlugin");

/** @typedef {import("../declarations/WebpackOptions").LibraryCustomUmdCommentObject} LibraryCustomUmdCommentObject */
/** @typedef {import("../declarations/WebpackOptions").LibraryCustomUmdObject} LibraryCustomUmdObject */
/** @typedef {import("./Compiler")} Compiler */

/**
 * @param {string[]} accessor the accessor to convert to path
 * @returns {string} the path
 */
const accessorToObjectAccess = accessor => {
	return accessor.map(a => `[${JSON.stringify(a)}]`).join("");
};

/**
 * @param {string=} base the path prefix
 * @param {string|string[]|LibraryCustomUmdObject} accessor the accessor
 * @param {"amd" | "commonjs" | "root"} umdProperty property used when a custom umd object is provided
 * @param {string=} joinWith the element separator
 * @returns {string} the path
 */
const accessorAccess = (base, accessor, umdProperty, joinWith = "; ") => {
	const normalizedAccessor =
		typeof accessor === "object" && !Array.isArray(accessor)
			? accessor[umdProperty]
			: accessor;
	const accessors = Array.isArray(normalizedAccessor)
		? normalizedAccessor
		: [normalizedAccessor];
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
 * @typedef {Object} LibraryOptions
 * @property {string|string[]|LibraryCustomUmdObject=} library name of library
 * @property {string=} libraryTarget type of library
 * @property {boolean=} umdNamedDefine setting this to true will name the UMD module
 * @property {string|LibraryCustomUmdCommentObject=} auxiliaryComment comment in the UMD wrapper
 * @property {string|string[]=} libraryExport which export should be exposed as library
 * @property {string=} globalObject global object expression
 */

class LibraryTemplatePlugin {
	/**
	 * @param {LibraryOptions} options options
	 */
	constructor(options) {
		if (arguments.length > 1) {
			options = {
				library: arguments[0],
				libraryTarget: arguments[1],
				umdNamedDefine: arguments[2],
				auxiliaryComment: arguments[3],
				libraryExport: arguments[4],
				globalObject: null
			};
		}
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		if (this.options.libraryExport) {
			const ExportPropertyTemplatePlugin = require("./ExportPropertyTemplatePlugin");
			new ExportPropertyTemplatePlugin(
				this.options.libraryExport,
				"used a library export"
			).apply(compiler);
		} else {
			const FlagEntryExportAsUsedPlugin = require("./FlagEntryExportAsUsedPlugin");
			new FlagEntryExportAsUsedPlugin(
				this.options.libraryTarget !== "module",
				"used a library export"
			).apply(compiler);
		}
		switch (this.options.libraryTarget) {
			case "umd":
			case "umd2": {
				const UmdTemplatePlugin = require("./UmdTemplatePlugin");
				new UmdTemplatePlugin(this.options.library, {
					optionalAmdExternalAsGlobal: this.options.libraryTarget === "umd2",
					namedDefine: this.options.umdNamedDefine,
					auxiliaryComment: this.options.auxiliaryComment || ""
				}).apply(compiler);
				break;
			}
			case "amd":
			case "amd-require": {
				const AmdTemplatePlugin = require("./AmdTemplatePlugin");
				new AmdTemplatePlugin({
					name: this.options.library,
					requireAsWrapper: this.options.libraryTarget === "amd-require"
				}).apply(compiler);
				break;
			}
			case "var":
				if (
					!this.options.library ||
					(typeof this.options.library === "object" &&
						!Array.isArray(this.options.library))
				) {
					throw new Error(
						"library name must be set and not an UMD custom object for non-UMD target"
					);
				}
				new SetVarTemplatePlugin(
					`var ${accessorAccess(undefined, this.options.library, "root")}`,
					false
				).apply(compiler);
				break;
			case "assign":
				new SetVarTemplatePlugin(
					accessorAccess(undefined, this.options.library, "root"),
					false
				).apply(compiler);
				break;
			case "this":
			case "self":
			case "window":
				if (this.options.library) {
					new SetVarTemplatePlugin(
						accessorAccess(
							this.options.libraryTarget,
							this.options.library,
							"root"
						),
						false
					).apply(compiler);
				} else {
					new SetVarTemplatePlugin(this.options.libraryTarget, true).apply(
						compiler
					);
				}
				break;
			case "global": {
				const globalObject =
					this.options.globalObject || compiler.options.output.globalObject;
				if (this.options.library) {
					new SetVarTemplatePlugin(
						accessorAccess(globalObject, this.options.library, "root"),
						false
					).apply(compiler);
				} else {
					new SetVarTemplatePlugin(globalObject, true).apply(compiler);
				}
				break;
			}
			case "commonjs":
				if (this.options.library) {
					new SetVarTemplatePlugin(
						accessorAccess("exports", this.options.library, "commonjs"),
						false
					).apply(compiler);
				} else {
					new SetVarTemplatePlugin("exports", true).apply(compiler);
				}
				break;
			case "commonjs2":
			case "commonjs-module":
				new SetVarTemplatePlugin("module.exports", false).apply(compiler);
				break;
			case "jsonp": {
				if (!this.options.library || typeof this.options.library === "object") {
					throw new Error(
						"library name must be set and not an array or UMD custom object for non-UMD target"
					);
				}
				const JsonpExportTemplatePlugin = require("./web/JsonpExportTemplatePlugin");
				new JsonpExportTemplatePlugin(this.options.library).apply(compiler);
				break;
			}
			case "system": {
				const SystemTemplatePlugin = require("./SystemTemplatePlugin");
				new SystemTemplatePlugin({
					name: this.options.library
				}).apply(compiler);
				break;
			}
			case "module":
				// TODO
				break;
			default:
				throw new Error(
					`${this.options.libraryTarget} is not a valid Library target`
				);
		}
	}
}

module.exports = LibraryTemplatePlugin;
