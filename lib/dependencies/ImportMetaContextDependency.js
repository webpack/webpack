/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ContextDependency = require("./ContextDependency");
const ModuleDependencyTemplateAsRequireId = require("./ModuleDependencyTemplateAsRequireId");

/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("./ContextDependency").ContextDependencyOptions} ContextDependencyOptions */
/** @typedef {import("../util/globUtils").ResolvedContextModuleGlobPattern} ResolvedContextModuleGlobPattern */

/**
 * @typedef {object} ImportMetaGlobDependencyOptions
 * @property {string[]} globPatterns glob patterns
 * @property {ResolvedContextModuleGlobPattern[]} resolvedGlobPatterns resolved glob patterns
 * @property {string} context context
 * @property {string} baseDir base directory
 * @property {boolean} recursive recursive
 * @property {ContextDependencyOptions["mode"]} mode mode
 * @property {string | undefined} globImport glob import
 * @property {string} globQuery glob query
 * @property {boolean} globExhaustive glob exhaustive
 * @property {ContextDependencyOptions["referencedExports"]} referencedExports referenced exports
 * @property {Range} range range
 */

class ImportMetaContextDependency extends ContextDependency {
	/**
	 * @param {ContextDependencyOptions} options options
	 * @param {Range} range range
	 */
	constructor(options, range) {
		super(options);

		this.range = range;
	}

	/**
	 * Returns a request context.
	 * @returns {string | undefined} a request context
	 */
	getContext() {
		const globContext =
			this.options &&
			/** @type {{ globContext?: string }} */ (this.options).globContext;
		if (globContext) return globContext;
		return super.getContext();
	}

	get category() {
		return "esm";
	}

	get type() {
		if (this.options.globPatterns) {
			return `import.meta.glob ${this.options.mode}`;
		}
		return `import.meta.webpackContext ${this.options.mode}`;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		const { globPatterns } = this.options;
		if (globPatterns) {
			const { options } = this;
			return (
				`context${this.getContext() || ""}|glob request${options.request} ` +
				`${options.recursive} ${globPatterns.join(",")} ` +
				`${options.mode}${options.globExhaustive ? " globExhaustive" : ""}` +
				`${options.globImport ? ` globImport:${options.globImport}` : ""}` +
				`${
					options.referencedExports
						? ` referencedExports:${JSON.stringify(options.referencedExports)}`
						: ""
				}`
			);
		}
		return super.getResourceIdentifier();
	}
}

makeSerializable(
	ImportMetaContextDependency,
	"webpack/lib/dependencies/ImportMetaContextDependency"
);

ImportMetaContextDependency.Template = ModuleDependencyTemplateAsRequireId;

module.exports = ImportMetaContextDependency;
