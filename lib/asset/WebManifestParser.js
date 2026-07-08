/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { parse } = require("acorn");
const Parser = require("../Parser");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");

/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").ObjectExpression} ObjectExpression */
/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

// acorn decorates every node with numeric source offsets (absent from the estree types).
/** @typedef {{ start: number, end: number }} Positioned */

// A URL carrying its own scheme (`https:`, `data:`, …) is external; it is only
// bundled when `experiments.buildHttp` is enabled (like an absolute URL in HTML).
const ABSOLUTE_URL_SCHEME_REGEXP = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
// Manifest members whose array items carry an asset `src` (`icons[].src`,
// `screenshots[].src`, and `shortcuts[].icons[].src` — the last nests under `icons`).
const ICON_CONTAINER_KEYS = new Set(["icons", "screenshots"]);

/**
 * Parses a Web App Manifest (`.webmanifest`) so its icon/screenshot `src`
 * URLs are bundled as assets. Reuses acorn (JSON is a valid JS expression
 * literal) to recover the exact source offsets, then emits an
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
		if (Buffer.isBuffer(source)) {
			source = source.toString("utf8");
		} else if (typeof source === "object") {
			throw new Error("webpackAst is unexpected for the WebManifestParser");
		}
		if (source[0] === "﻿") {
			source = source.slice(1);
		}

		const module = state.module;
		// Without `buildHttp` there is no handler to fetch remote icons, so an
		// absolute URL is left as-is rather than rewritten to an ignored asset.
		const buildHttp = Boolean(state.options.experiments.buildHttp);

		/** @type {Program | undefined} */
		let ast;
		try {
			// Wrap in parens so the top-level object is an expression, not a block.
			ast = /** @type {Program} */ (
				/** @type {unknown} */ (parse(`(${source})`, { ecmaVersion: "latest" }))
			);
		} catch (_err) {
			// Not valid JSON — leave the file untouched (still emitted as-is).
			ast = undefined;
		}

		const statement = ast && ast.body[0];
		if (
			statement &&
			statement.type === "ExpressionStatement" &&
			statement.expression.type === "ObjectExpression"
		) {
			/**
			 * @param {ObjectExpression} obj object expression node
			 * @param {string | undefined} parentKey key of the array/object this node sits in
			 */
			const walk = (obj, parentKey) => {
				for (const prop of obj.properties) {
					if (prop.type !== "Property") continue;
					const key =
						prop.key.type === "Literal" && typeof prop.key.value === "string"
							? prop.key.value
							: prop.key.type === "Identifier"
								? prop.key.name
								: undefined;
					const value = /** @type {Expression} */ (prop.value);
					if (value.type === "ObjectExpression") {
						walk(value, key);
					} else if (value.type === "ArrayExpression") {
						for (const element of value.elements) {
							if (element && element.type === "ObjectExpression") {
								walk(element, key);
							}
						}
					} else if (
						key === "src" &&
						value.type === "Literal" &&
						typeof value.value === "string" &&
						parentKey !== undefined &&
						ICON_CONTAINER_KEYS.has(parentKey)
					) {
						const url = value.value;
						// Fragment-only refs aren't assets; absolute URLs need `buildHttp`.
						if (!url || url.startsWith("#")) continue;
						if (!buildHttp && ABSOLUTE_URL_SCHEME_REGEXP.test(url)) continue;
						// acorn offsets are into `(${source})`; the leading `(` and the
						// opening quote cancel, so the inner span is [start, end - 2].
						const { start, end } = /** @type {Positioned} */ (
							/** @type {unknown} */ (value)
						);
						const dep = new HtmlSourceDependency(url, [start, end - 2]);
						module.addDependency(dep);
						module.addCodeGenerationDependency(dep);
					}
				}
			};
			walk(statement.expression, undefined);
		}

		/** @type {BuildInfo} */
		(state.module.buildInfo).strict = true;

		return state;
	}
}

module.exports = WebManifestParser;
