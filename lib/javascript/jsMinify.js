/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {import("./syntax-printer").MinifyOptions} MinifyOptions */
/** @typedef {import("../util/SourceProcessor").SourceMap} SourceMap */
/** @typedef {import("./syntax-printer").PrintNode} PrintNode */

/** @typedef {import("./syntax-parser").JavascriptSourceType} JavascriptSourceType */

/** @typedef {import("minimizer-webpack-plugin").ExtractCommentsFunction} CommentCondition */
/** @typedef {import("minimizer-webpack-plugin").ExtractCommentsOptions} ExtractCommentsOption */

/**
 * A condition as it may be written, which is what the plugin names plus the
 * pattern any other string is.
 * @typedef {import("minimizer-webpack-plugin").ExtractCommentsCondition | string} CommentConditionOption
 */

/**
 * A `minify` function for `minimizer-webpack-plugin` (passed as its `minify`
 * option): minifies one JavaScript asset in one `JavascriptSourceProcessor`
 * run, which reads, mangles, compresses and prints it, so JavaScript
 * minification reuses that plugin's pipeline — source maps, caching and
 * worker-thread parallelization.
 *
 * The processor is read inside the body rather than imported at module scope:
 * `minimizer-webpack-plugin` ships this function to its worker pool as source,
 * where this module's own scope is gone.
 * @param {{ [file: string]: string | Buffer }} input a single `{ filename: code }` entry; a `Buffer` is read as UTF-8
 * @param {object=} sourceMap the asset's input source map — the plugin chains it onto the map returned here, so it isn't read directly
 * @param {(MinifyOptions & { as?: JavascriptSourceType })=} minimizerOptions `optimization.minimize.javascript`; `as` names the production the source is written in, which is the source's own rather than the configuration's
 * @param {ExtractCommentsOption=} extractComments which comments to move into a separate file
 * @returns {Promise<{ code: string, map?: SourceMap, extractedComments?: string[] }>} the minified code, its input->output source map, and the comments taken out of it
 */
const jsMinify = async (
	input,
	sourceMap,
	minimizerOptions,
	extractComments
) => {
	// `output` is the older spelling of `format`, merged into it below.
	const { as, output, ...options } = minimizerOptions || {};

	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	/**
	 * One comment condition, whatever shape it was written in. A string other
	 * than `all` or `some` is a pattern, as the minifier reads it.
	 * @param {CommentConditionOption} condition as configured
	 * @returns {CommentCondition} the condition as a function
	 */
	const asCondition = (condition) => {
		if (typeof condition === "boolean") {
			return condition ? () => true : () => false;
		}
		if (typeof condition === "function") return condition;
		if (condition instanceof RegExp) {
			return (node, comment) => condition.test(comment.value);
		}
		if (condition === "all") return () => true;
		if (condition === "some") {
			const pattern = /@preserve|@lic|@cc_on|^\**!/i;
			return (node, comment) =>
				(comment.type === "comment2" || comment.type === "comment1") &&
				pattern.test(comment.value);
		}
		// Compile once, but only when asked: a malformed pattern must still be
		// harmless when there are no comments to test against it.
		/** @type {RegExp | undefined} */
		let pattern;
		return (node, comment) => {
			if (pattern === undefined) pattern = new RegExp(condition);
			return pattern.test(comment.value);
		};
	};

	/** @type {NonNullable<MinifyOptions["format"]>} */
	const format = { beautify: false, ...options.format, ...output };
	const extracted = /** @type {string[]} */ ([]);
	/** @type {CommentConditionOption} */
	let stated = false;
	// Whether extraction was asked for at all, which is not the same as asking
	// for it and naming a condition nothing matches: only the first leaves the
	// comments the minifier calls `some` in the file.
	let extracting = true;
	if (typeof extractComments === "boolean") {
		if (extractComments) stated = "some";
		else extracting = false;
	} else if (
		typeof extractComments === "string" ||
		extractComments instanceof RegExp ||
		typeof extractComments === "function"
	) {
		stated = extractComments;
	} else if (extractComments && typeof extractComments === "object") {
		const { condition } = extractComments;
		stated =
			typeof condition === "boolean"
				? condition && "some"
				: condition === undefined
					? "some"
					: condition;
	} else {
		extracting = false;
	}
	const kept =
		format.comments === undefined
			? extracting
				? false
				: "some"
			: /** @type {CommentConditionOption} */ (format.comments);
	if (!extracting && kept === false) {
		// Nothing to keep and nothing to take out, so the minifier is told that rather
		// than handed a callback it must ask about every comment it reads.
		format.comments = false;
	} else {
		const extract = asCondition(stated);
		const preserve = asCondition(kept);
		const seen = new Set();
		format.comments = (
			/** @type {PrintNode} */ node,
			/** @type {Parameters<CommentCondition>[1]} */ comment
		) => {
			if (extract(node, comment)) {
				const text =
					comment.type === "comment2"
						? `/*${comment.value}*/`
						: `//${comment.value}`;
				if (!seen.has(text)) {
					seen.add(text);
					extracted.push(text);
				}
			}
			return preserve(node, comment);
		};
	}

	const compress =
		typeof options.compress === "boolean"
			? options.compress
				? {}
				: false
			: { ...options.compress };
	if (compress) {
		// `ecma` is read per option group, and the compressor is the one that
		// would otherwise write syntax the asset's own `ecma` excludes.
		if (typeof compress.ecma === "undefined") compress.ecma = options.ecma;
		// https://github.com/webpack/webpack/issues/16135
		if (options.ecma === 5 && typeof compress.arrows === "undefined") {
			compress.arrows = false;
		}
	}

	const [[file, given]] = Object.entries(input);
	const code = typeof given === "string" ? given : given.toString("utf8");
	const minifyOptions = {
		...options,
		...(as === undefined ? undefined : { sourceType: as }),
		compress,
		mangle:
			options.mangle === undefined || options.mangle === null
				? true
				: typeof options.mangle === "boolean"
					? options.mangle
					: { ...options.mangle },
		parse: { ...options.parse },
		format
	};
	// One walk reads, mangles, compresses and prints it, as `cssMinify` runs
	// its stylesheet. Naming the input asks for the map the plugin chains.
	const result = new webpack.javascript.syntax.SourceProcessor().process(code, {
		...minifyOptions,
		mode: "minify",
		...(sourceMap ? { source: file, content: code } : undefined)
	});

	return {
		// A handler printed as nothing (dropped whole, or no code asked for) is
		// given back as written, as the plugin's own entry points answer.
		code: as === "event-handler" && !result.code ? code : result.code,
		map: result.map,
		extractedComments: extracted
	};
};

// Worker-safe (see the body's in-worker `require`), so it may run in the shared
// worker-thread pool alongside cssMinify and htmlMinify.
jsMinify.supportsWorkerThreads = () => true;

/**
 * The version minified output is cached against, so an upgrade of the printer —
 * which ships inside webpack — invalidates what it minified.
 * @returns {string} webpack's version
 */
jsMinify.getMinimizerVersion = () => require("../../package.json").version;

/**
 * The language this minifies, for a caller dispatching source that carries no
 * filename — a `<script>` an HTML document embeds.
 * @returns {string[]} the languages
 */
jsMinify.getTypes = () => ["javascript"];

// Sharing one `minimizer-webpack-plugin` instance, each asset reaches only the
// minify functions whose `filter` accepts it. This claims JavaScript, so
// cssMinify and htmlMinify coexist with it in one worker pool.
/**
 * @param {string} name asset filename
 * @returns {boolean} true for JavaScript assets
 */
jsMinify.filter = (name) => /^[^?#]*\.[cm]?js(?:[?#].*)?$/i.test(name);

module.exports = jsMinify;
