/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const HtmlSourceDependency = require("../dependencies/html/HtmlSourceDependency");
const { A, Field, NodeType, parseProgram } =
	require("../javascript/syntax").parser;
const Parser = require("../module/Parser");
const { escapeUrlRequest } = require("../util/identifier");

/** @import { BuildInfo } from "../module/Module" */
/** @import { ParserState, PreparsedAst } from "../module/Parser" */

// A URL carrying its own scheme (`https:`, `data:`, …) is external; it is only
// bundled when `experiments.buildHttp` is enabled (like an absolute URL in HTML).
const ABSOLUTE_URL_SCHEME_REGEXP = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
// Manifest members whose array items carry an asset `src` (`icons[].src`,
// `screenshots[].src`, and `shortcuts[].icons[].src` — the last nests under `icons`).
const ICON_CONTAINER_KEYS = new Set(["icons", "screenshots"]);
const BOM_BYTE_LENGTH = 3;

/**
 * Parses a Web App Manifest (`.webmanifest`) so its icon/screenshot `src`
 * URLs are bundled as assets. Reuses the JavaScript parser (JSON is a valid JS
 * expression literal) to recover the exact source offsets, then emits an
 * `HtmlSourceDependency` per URL so the generator can rewrite it in place.
 */
class WebManifestParser extends Parser {
	/**
	 * Parses the provided source and updates the parser state.
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		// The generator replaces over the raw buffer, so the emitted ranges are
		// byte offsets rather than the UTF-16 ones the parser reports.
		const binary = Buffer.isBuffer(source);
		if (binary) {
			source = /** @type {Buffer} */ (source).toString("utf8");
		} else if (typeof source === "object") {
			throw new Error("webpackAst is unexpected for the WebManifestParser");
		}
		let leadingBytes = 0;
		if (source[0] === "﻿") {
			source = source.slice(1);
			leadingBytes = binary ? BOM_BYTE_LENGTH : 1;
		}
		const text = source;
		const asciiOnly = !binary || Buffer.byteLength(text) === text.length;
		/**
		 * @param {number} offset offset in UTF-16 code units into `text`
		 * @returns {number} matching offset into the module source
		 */
		const toSourceOffset = (offset) =>
			(asciiOnly ? offset : Buffer.byteLength(text.slice(0, offset))) +
			leadingBytes;

		const module = state.module;
		// Without `buildHttp` there is no handler to fetch remote icons, so an
		// absolute URL is left as-is rather than rewritten to an ignored asset.
		const buildHttp = Boolean(state.options.experiments.buildHttp);

		/** @type {number} */
		let program;
		try {
			// Wrap in parens so the top-level object is an expression, not a block.
			program = parseProgram(`(${source})`, 0, { sourceType: "script" });
		} catch (_err) {
			// Not valid JSON — leave the file untouched (still emitted as-is).
			program = 0;
		}

		const statement = program === 0 ? 0 : A.field(0, Field.body, program);
		const object =
			statement !== 0 && A.type(statement) === NodeType.ExpressionStatement
				? A.field(0, Field.expression, statement)
				: 0;
		if (object !== 0 && A.type(object) === NodeType.ObjectExpression) {
			/**
			 * @param {number} obj an object expression node
			 * @param {string | undefined} parentKey key of the array/object this node sits in
			 */
			const walk = (obj, parentKey) => {
				const count = A.fieldCount(Field.properties, obj);
				for (let i = 0; i < count; i++) {
					const prop = A.field(i, Field.properties, obj);
					if (A.type(prop) !== NodeType.Property) continue;
					const keyNode = A.field(0, Field.key, prop);
					const keyType = A.type(keyNode);
					const keyValue =
						keyType === NodeType.Literal ? A.value(keyNode) : undefined;
					const key =
						typeof keyValue === "string"
							? keyValue
							: keyType === NodeType.Identifier
								? A.name(keyNode)
								: undefined;
					const value = A.field(0, Field.value, prop);
					const valueType = A.type(value);
					if (valueType === NodeType.ObjectExpression) {
						walk(value, key);
					} else if (valueType === NodeType.ArrayExpression) {
						const length = A.fieldCount(Field.elements, value);
						for (let j = 0; j < length; j++) {
							const element = A.field(j, Field.elements, value);
							if (
								element !== 0 &&
								A.type(element) === NodeType.ObjectExpression
							) {
								walk(element, key);
							}
						}
					} else if (
						key === "src" &&
						valueType === NodeType.Literal &&
						parentKey !== undefined &&
						ICON_CONTAINER_KEYS.has(parentKey)
					) {
						const url = A.value(value);
						if (typeof url !== "string") continue;
						// Fragment-only refs aren't assets; absolute URLs need `buildHttp`.
						if (!url || url.startsWith("#")) continue;
						if (!buildHttp && ABSOLUTE_URL_SCHEME_REGEXP.test(url)) continue;
						// offsets are into `(${source})`; the leading `(` and the
						// opening quote cancel, so the inner span is [start, end - 2].
						const dep = new HtmlSourceDependency(
							escapeUrlRequest(url, /** @type {string} */ (module.context)),
							[toSourceOffset(A.start(value)), toSourceOffset(A.end(value) - 2)]
						);
						module.addDependency(dep);
						module.addCodeGenerationDependency(dep);
					}
				}
			};
			walk(object, undefined);
		}

		/** @type {BuildInfo} */
		(state.module.buildInfo).strict = true;

		return state;
	}
}

module.exports = WebManifestParser;
