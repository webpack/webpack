/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Parser = require("../module/Parser");
const parseJson = require("../util/parseJson");
const JsonData = require("./JsonData");
const JsonExportsDependency = require("./JsonExportsDependency");

/** @import { BuiltJsonModule } from "./JsonModule" */
/** @import { JsonParserOptions } from "../../declarations/WebpackOptions" */
/** @import { ParserState, PreparsedAst } from "../module/Parser" */
/** @import { JsonValue } from "../fs/fs" */

/** @typedef {(input: string) => Buffer | JsonValue} ParseFn */

/**
 * Defines the function returning type used by this module.
 * @template T
 * @typedef {import("../util/memoize").FunctionReturning<T>} FunctionReturning
 */

/**
 * @extends {Parser<BuiltJsonModule>}
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
		const jsonData = new JsonData(data);
		const { buildInfo, buildMeta } = /** @type {BuiltJsonModule} */ (
			state.module
		);
		buildInfo.jsonData = jsonData;
		buildInfo.strict = true;
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

module.exports = JsonParser;
