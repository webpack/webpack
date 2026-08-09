/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const memoize = require("../util/memoize");

/** @typedef {import("../../declarations/WebpackOptions").OutputHtmlOptions} OutputHtmlOptions */

const getHtmlSyntax = memoize(() => require("./syntax"));

/**
 * @param {string} name meta name
 * @param {string} content meta content
 * @returns {string} meta tag
 */
const metaTag = (name, content) => {
	const { escapeAttribute } = getHtmlSyntax();
	// og: uses property=; all others (including twitter:) use name=
	const attr = name.startsWith("og:")
		? `property="${escapeAttribute(name)}"`
		: `name="${escapeAttribute(name)}"`;
	return `<meta ${attr} content="${escapeAttribute(content)}">`;
};

/**
 * @param {string | { href: string, target?: string }} base base option
 * @returns {string} base tag
 */
const baseTag = (base) => {
	const { escapeAttribute } = getHtmlSyntax();
	const href = typeof base === "string" ? base : base.href;
	const targetAttr =
		typeof base === "object" && base.target
			? ` target="${escapeAttribute(base.target)}"`
			: "";
	return `<base href="${escapeAttribute(href)}"${targetAttr}>`;
};

/**
 * Serializes the head tags `output.html` asks for, in spec order: charset,
 * base, meta, title. Only for pages built from scratch — an authored page
 * merges the same options during `parse`, where its own tags win.
 * @param {OutputHtmlOptions} opts html options
 * @returns {string} head tags string
 */
const buildHeadTags = (opts) => {
	const { escapeAttribute, escapeText } = getHtmlSyntax();
	let out = "";
	const meta = opts.meta;
	if (meta && meta.charset) {
		out += `<meta charset="${escapeAttribute(meta.charset)}">`;
	}
	if (opts.base) out += baseTag(opts.base);
	if (meta) {
		for (const [name, content] of Object.entries(meta)) {
			if (name === "charset") continue;
			out += metaTag(name, content);
		}
	}
	if (opts.title) {
		out += `<title>${escapeText(opts.title)}</title>`;
	}
	return out;
};

module.exports.baseTag = baseTag;
module.exports.buildHeadTags = buildHeadTags;
module.exports.metaTag = metaTag;
