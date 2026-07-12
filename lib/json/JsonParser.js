/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Parser from "../Parser.js";
import JsonExportsDependency from "../dependencies/JsonExportsDependency.js";
import parseJson from "../util/parseJson.js";
import JsonData from "./JsonData.js";
/** @typedef {import("../../declarations/WebpackOptions.js").JsonParserOptions} JsonParserOptions */
/** @typedef {import("./JsonModule.js").JsonModuleBuildInfo} JsonModuleBuildInfo */
/** @typedef {import("../Module.js").BuildMeta} BuildMeta */
/** @typedef {import("../Parser.js").ParserState} ParserState */
/** @typedef {import("../Parser.js").PreparsedAst} PreparsedAst */
/** @typedef {import("../util/fs.js").JsonValue} JsonValue */

/** @typedef {(input: string) => Buffer | JsonValue} ParseFn */

/**
 * Defines the function returning type used by this module.
 * @template T
 * @typedef {import("../util/memoize.js").FunctionReturning<T>} FunctionReturning
 */

class JsonParser extends Parser {
	/**
	 * Creates an instance of JsonParser.
	 * @param {JsonParserOptions} options parser options
	 */
	constructor(options = {}) {
		super();
		/** @type {JsonParserOptions} */
		this.options = options;
	}

	/**
	 * Parses the provided source and updates the parser state.
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (Buffer.isBuffer(source)) {
			source = source.toString("utf8");
		}

		const parseFn =
			typeof this.options.parse === "function" ? this.options.parse : parseJson;
		/** @type {Buffer | JsonValue | undefined} */
		const data =
			typeof source === "object"
				? source
				: parseFn(source[0] === "\uFEFF" ? source.slice(1) : source);
		const jsonData = new JsonData(/** @type {Buffer | JsonValue} */ (data));
		const buildInfo = /** @type {JsonModuleBuildInfo} */ (
			state.module.buildInfo
		);
		buildInfo.jsonData = jsonData;
		buildInfo.strict = true;
		const buildMeta = /** @type {BuildMeta} */ (state.module.buildMeta);
		buildMeta.exportsType = "default";
		buildMeta.defaultObject =
			typeof data === "object"
				? this.options.namedExports === false
					? false
					: this.options.namedExports === true
						? "redirect"
						: "redirect-warn"
				: false;
		state.module.addDependency(
			new JsonExportsDependency(
				jsonData,
				/** @type {number} */
				(this.options.exportsDepth)
			)
		);
		return state;
	}
}

export default JsonParser;

export { JsonParser as "module.exports" };
