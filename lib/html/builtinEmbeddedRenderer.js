/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { CSS_TYPE } = require("../ModuleSourceTypeConstants");

/** @import { CssProcessOptions } from "../css/syntax" */
/** @import { EmbeddedSourceRenderer } from "./syntax" */

/**
 * What this minifies inline CSS with: the CSS minifier's own options, so an
 * inline declaration is held to the rules a `.css` asset is.
 * @typedef {Pick<CssProcessOptions, "environment" | "convertLengthUnits" | "rewriteCustomProperties" | "transforms" | "unusedSymbols" | "pseudoClasses">} BuiltinEmbeddedRendererOptions
 */

// Both are loaded on first render rather than at module load: a document that
// embeds no CSS and no JSON pays for neither.
/** @type {typeof import("../css/syntax") | undefined} */
let _cssSyntax;
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
 * for a `<style>` or `style=""` and `stripJsonWhitespace` for JSON, declining
 * every other language. A caller passes it where it has no renderer of its own,
 * or behind one for the languages that one declines — the HTML printer minifies
 * none of this itself.
 * @param {BuiltinEmbeddedRendererOptions=} options the CSS minifier's options, so an inline declaration is minified as the `.css` assets are
 * @returns {EmbeddedSourceRenderer} the renderer
 */
const builtinEmbeddedRenderer = (options = {}) => {
	const { BLOCK_CONTENTS, JSON_TYPE } =
		_htmlSyntax || (_htmlSyntax = require("./syntax"));
	const sheet = { mode: /** @type {"minify"} */ ("minify"), ...options };
	const block = { ...sheet, as: BLOCK_CONTENTS };
	// A `style=""` repeats across a document far more often than it varies.
	/** @type {Map<string, string>} */
	const blocks = new Map();
	return (source, info) => {
		if (info.type === JSON_TYPE) return stripJsonWhitespace(source);
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
};

module.exports.builtinEmbeddedRenderer = builtinEmbeddedRenderer;
module.exports.stripJsonWhitespace = stripJsonWhitespace;
