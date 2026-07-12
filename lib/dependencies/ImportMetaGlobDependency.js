/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

import makeSerializable from "../util/makeSerializable.js";
import ContextDependency from "./ContextDependency.js";
import ModuleDependencyTemplateAsRequireId from "./ModuleDependencyTemplateAsRequireId.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("./ContextDependency.js").ContextDependencyOptions} ContextDependencyOptions */

/**
 * @typedef {ContextDependencyOptions & {
 * patterns: string[],
 * requestContext: string,
 * importName?: string,
 * exhaustive?: boolean,
 * caseSensitive?: boolean,
 * }} ImportMetaGlobDependencyOptions
 */

class ImportMetaGlobDependency extends ContextDependency {
	/**
	 * @param {ImportMetaGlobDependencyOptions} options options
	 * @param {Range} range range
	 */
	constructor(options, range) {
		super(options, options ? options.requestContext : undefined);

		this.range = range;
	}

	get category() {
		return "esm";
	}

	get type() {
		return `import.meta.glob ${this.options.mode}`;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		const {
			patterns,
			request,
			recursive,
			mode,
			exhaustive,
			caseSensitive,
			importName,
			referencedExports
		} = /** @type {ImportMetaGlobDependencyOptions} */ (this.options);
		return (
			`context${this.getContext() || ""}|glob request${request} ` +
			`${recursive} ${patterns.join(",")} ` +
			`${mode}${exhaustive ? " exhaustive" : ""}` +
			`${caseSensitive === false ? " case-insensitive" : ""}` +
			`${importName ? ` import:${importName}` : ""}` +
			`${
				referencedExports
					? ` referencedExports:${JSON.stringify(referencedExports)}`
					: ""
			}`
		);
	}
}

makeSerializable(
	ImportMetaGlobDependency,
	"webpack/lib/dependencies/ImportMetaGlobDependency"
);

ImportMetaGlobDependency.Template = ModuleDependencyTemplateAsRequireId;

export default ImportMetaGlobDependency;

export { ImportMetaGlobDependency as "module.exports" };
