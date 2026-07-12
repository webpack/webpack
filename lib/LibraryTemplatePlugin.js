/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import EnableLibraryPlugin from "./library/EnableLibraryPlugin.js";
/** @typedef {import("../declarations/WebpackOptions.js").AuxiliaryComment} AuxiliaryComment */
/** @typedef {import("../declarations/WebpackOptions.js").LibraryExport} LibraryExport */
/** @typedef {import("../declarations/WebpackOptions.js").LibraryName} LibraryName */
/** @typedef {import("../declarations/WebpackOptions.js").LibraryType} LibraryType */
/** @typedef {import("../declarations/WebpackOptions.js").UmdNamedDefine} UmdNamedDefine */
/** @typedef {import("./Compiler.js").default} Compiler */

// TODO webpack 6 remove
class LibraryTemplatePlugin {
	/**
	 * Creates an instance of LibraryTemplatePlugin.
	 * @param {LibraryName} name name of library
	 * @param {LibraryType} target type of library
	 * @param {UmdNamedDefine} umdNamedDefine setting this to true will name the UMD module
	 * @param {AuxiliaryComment} auxiliaryComment comment in the UMD wrapper
	 * @param {LibraryExport} exportProperty which export should be exposed as library
	 */
	constructor(name, target, umdNamedDefine, auxiliaryComment, exportProperty) {
		this.library = {
			type: target || "var",
			name,
			umdNamedDefine,
			auxiliaryComment,
			export: exportProperty
		};
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { output } = compiler.options;
		output.library = this.library;
		new EnableLibraryPlugin(this.library.type).apply(compiler);
	}
}

export default LibraryTemplatePlugin;

export { LibraryTemplatePlugin as "module.exports" };
