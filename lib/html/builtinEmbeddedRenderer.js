/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { CSS_TYPE } = require("../module/ModuleSourceTypeConstants");

/** @import { CssProcessOptions } from "../css/syntax-parser" */
/** @import { EmbeddedSourceRenderer } from "./syntax-printer" */

/**
 * What this minifies inline CSS with: the CSS minifier's own options, so an
 * inline declaration is held to the rules a `.css` asset is.
 * @typedef {Pick<CssProcessOptions, "environment" | "convertLengthUnits" | "convertApproximateColors" | "dropOverriddenDeclarations" | "rewriteCustomProperties" | "transforms" | "unusedSymbols" | "pseudoClasses"> & BuiltinSvgOptions} BuiltinEmbeddedRendererOptions
 */

/**
 * @typedef {object} BuiltinSvgOptions
 * @property {boolean=} svg minify an SVG `data:` URL as the `.svg` assets are, wherever that is shorter (default false)
 */

// Both are loaded on first render rather than at module load: a document that
// embeds no CSS and no JSON pays for neither.
/** @type {typeof import("../css/syntax") | undefined} */
let _cssSyntax;
/** @type {typeof import("./syntax-parser") | undefined} */
let _htmlParser;
/** @type {typeof import("./syntax") | undefined} */
let _htmlSyntax;

/**
 * Strip the whitespace between a JSON body's tokens, every literal copied byte
 * for byte. Re-serializing would round numbers, drop a duplicate key and rewrite
 * the escapes that keep a string from closing the `<script>` early.
 * @param {string} json a `<script>` body
 * @returns {string} the stripped body, or the body as written where it is not JSON
 */
const stripJsonWhitespace = (json) => {
	try {
		JSON.parse(json);
	} catch (_err) {
		// Not JSON after all (a template, a placeholder) — not ours to touch.
		return json;
	}
	let out = "";
	let inString = false;
	let escaped = false;
	for (let i = 0; i < json.length; i++) {
		const c = json.charCodeAt(i);
		if (inString) {
			out += json[i];
			if (escaped) escaped = false;
			else if (c === 0x5c) escaped = true;
			else if (c === 0x22) inString = false;
			continue;
		}
		if (c === 0x22) {
			inString = true;
			out += json[i];
			continue;
		}
		// JSON whitespace (RFC 8259): tab, LF, CR, space.
		if (c === 0x09 || c === 0x0a || c === 0x0d || c === 0x20) continue;
		out += json[i];
	}
	return out;
};

/**
 * The renderer webpack ships for what a document embeds: its own CSS minifier
 * for a `<style>` or `style=""`, `stripJsonWhitespace` for JSON and, with `svg`,
 * the XML minifier for an SVG `data:` URL, declining every other language. A
 * caller passes it where it has no renderer of its own, or behind one for the
 * languages that one declines — the HTML printer minifies none of this itself.
 * @param {BuiltinEmbeddedRendererOptions=} options the CSS minifier's options, so an inline declaration is minified as the `.css` assets are, and `svg`, whether an SVG `data:` URL is minified as the `.svg` assets are
 * @returns {EmbeddedSourceRenderer} the renderer
 */
const builtinEmbeddedRenderer = (options = {}) => {
	const { BLOCK_CONTENTS, JSON_TYPE, SVG_TYPE } =
		_htmlParser || (_htmlParser = require("./syntax-parser"));
	const { svg, ...cssOptions } = options;
	const sheet = {
		mode: /** @type {"minify"} */ ("minify"),
		...cssOptions,
		// A stylesheet's own `url(data:image/svg+xml,…)`, which `renderSvg` answers.
		renderEmbeddedSource: svg
			? /** @type {EmbeddedSourceRenderer} */ (
					(source, info) =>
						info.type === SVG_TYPE ? renderSvg(source) : undefined
				)
			: undefined
	};
	const block = { ...sheet, as: BLOCK_CONTENTS };
	// A `style=""` repeats across a document far more often than it varies.
	/** @type {Map<string, string>} */
	const blocks = new Map();
	/** @type {EmbeddedSourceRenderer} */
	const render = (source, info) => {
		if (info.type === JSON_TYPE) return stripJsonWhitespace(source);
		// Only a whole `.svg` document: an inline `<svg>` subtree is HTML's to print.
		if (info.type === SVG_TYPE) {
			return svg && info.as === undefined ? renderSvg(source) : undefined;
		}
		if (info.type !== CSS_TYPE) return undefined;
		const isBlock = info.as === BLOCK_CONTENTS;
		if (isBlock) {
			const memoized = blocks.get(source);
			if (memoized !== undefined) return memoized;
		}
		const { SourceProcessor } =
			_cssSyntax || (_cssSyntax = require("../css/syntax"));
		let code;
		try {
			code = new SourceProcessor().process(
				source,
				isBlock ? block : sheet
			).code;
		} catch (_err) {
			// Text the minifier cannot read is left as written, by declining.
			return undefined;
		}
		if (isBlock) blocks.set(source, code);
		return code;
	};
	/**
	 * Minify an SVG document as the `.svg` assets are.
	 * @param {string} source an SVG document a `data:` URL holds
	 * @returns {string | undefined} it minified, or undefined where that is no shorter or it is not XML
	 */
	const renderSvg = (source) => {
		const { SourceProcessor } =
			_htmlSyntax || (_htmlSyntax = require("./syntax"));
		let code;
		try {
			// `'` around an attribute, since the URL usually sits in `"` quotes.
			code = new SourceProcessor().process(source, {
				xml: true,
				mode: "minify",
				xmlQuote: "'",
				renderEmbeddedSource: render
			}).code;
		} catch (_err) {
			// Not well-formed, or offered while an HTML parse is running.
			return undefined;
		}
		return code.length < source.length ? code : undefined;
	};
	return render;
};

module.exports.builtinEmbeddedRenderer = builtinEmbeddedRenderer;
module.exports.stripJsonWhitespace = stripJsonWhitespace;
