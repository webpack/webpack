/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {import("terser").FormatOptions} FormatOptions */
/** @typedef {import("terser").MinifyOptions} MinifyOptions */
/** @typedef {import("terser").MinifyOutput} MinifyOutput */

/**
 * Which production of JavaScript the source is: a classic script, a module, or
 * the body of an event handler, which is a function body and nothing terser
 * parses on its own.
 * @typedef {"script" | "module" | "event-handler"} JavascriptProduction
 */

/** @typedef {import("minimizer-webpack-plugin").ExtractCommentsFunction} CommentCondition */
/** @typedef {import("minimizer-webpack-plugin").ExtractCommentsOptions} ExtractCommentsOption */

/**
 * A condition as it may be written, which is what the plugin names plus the
 * pattern any other string is.
 * @typedef {import("minimizer-webpack-plugin").ExtractCommentsCondition | string} CommentConditionOption
 */

/**
 * A `minify` function for `minimizer-webpack-plugin` (passed as its `minify`
 * option): minifies one JavaScript asset with terser, so JavaScript
 * minification reuses that plugin's pipeline — source maps, caching and
 * worker-thread parallelization.
 *
 * terser is read inside the body rather than imported at module scope:
 * `minimizer-webpack-plugin` ships this function to its worker pool as source,
 * where this module's own scope is gone.
 * @param {{ [file: string]: string | Buffer }} input a single `{ filename: code }` entry; a `Buffer` is read as UTF-8
 * @param {object=} sourceMap the asset's input source map — the plugin chains it onto the map returned here, so it isn't read directly
 * @param {(MinifyOptions & { as?: JavascriptProduction })=} minimizerOptions `optimization.minimize.javascript`, as terser's own options; `as` names the production the source is written in, which is the source's own rather than the configuration's
 * @param {ExtractCommentsOption=} extractComments which comments to move into a separate file
 * @returns {Promise<{ code: string, map?: MinifyOutput["map"], extractedComments?: string[], errors?: Error[] }>} the minified code, its input->output source map, and the comments taken out of it
 */
const jsMinify = async (
	input,
	sourceMap,
	minimizerOptions,
	extractComments
) => {
	/** @type {{ minify: typeof import("terser").minify }} */
	let terser;
	try {
		// Through webpack's own printer rather than `require("terser")`: it
		// installs the phases webpack implements itself, and falls back to terser's.
		const webpack =
			/** @type {typeof import("../index")} */
			(
				// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
				require(/** @type {string} */ ("webpack"))
			);

		terser = await webpack.javascript.syntax.printer.load();
	} catch (err) {
		return { code: "", errors: [/** @type {Error} */ (err)] };
	}

	const { as, ...options } = minimizerOptions || {};
	// A handler body is minified as the function it belongs to: named past any
	// run of `_` the body holds, so nothing in it resolves to that function, and
	// opened on a new line so a line comment cannot close the body.
	const asFunction = (/** @type {string} */ body) => {
		const runs = body.match(/_+/g);
		const longest = runs
			? runs.reduce((widest, run) => Math.max(widest, run.length), 0)
			: 0;
		return `function ${"_".repeat(longest + 1)}(){${body}\n}`;
	};
	// The body back out of that function. `undefined` where the answer is not
	// that function — it held something else, or was dropped whole as the unused
	// declaration it is.
	const functionBody = (/** @type {string | undefined} */ answered) => {
		if (typeof answered !== "string") return undefined;
		const written = answered.trim().replace(/;$/, "");
		const opened = written.indexOf("{");
		return opened !== -1 &&
			written.endsWith("}") &&
			/^function\s+[^\s(]+\s*\(\s*\)\s*$/.test(written.slice(0, opened))
			? written.slice(opened + 1, -1).trim()
			: undefined;
	};

	/**
	 * One comment condition, whatever shape it was written in. A string other
	 * than `all` or `some` is a pattern, as terser reads it.
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
			return (node, comment) =>
				(comment.type === "comment2" || comment.type === "comment1") &&
				/@preserve|@lic|@cc_on|^\**!/i.test(comment.value);
		}
		return (node, comment) => new RegExp(condition).test(comment.value);
	};

	const format = { beautify: false, ...options.format, ...options.output };
	const extracted = /** @type {string[]} */ ([]);
	/** @type {CommentConditionOption} */
	let stated = false;
	// Whether extraction was asked for at all, which is not the same as asking
	// for it and naming a condition nothing matches: only the first leaves the
	// comments terser calls `some` in the file.
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
		// Nothing to keep and nothing to take out, so terser is told that rather
		// than handed a callback it must ask about every comment it reads.
		format.comments = false;
	} else {
		const extract = asCondition(stated);
		const preserve = asCondition(kept);
		const seen = new Set();
		format.comments = (
			/** @type {EXPECTED_ANY} */ node,
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
		// terser reads `ecma` per option group, and its compressor is the one that
		// would otherwise write syntax the asset's own `ecma` excludes.
		if (typeof compress.ecma === "undefined") compress.ecma = options.ecma;
		// https://github.com/webpack/webpack/issues/16135
		if (options.ecma === 5 && typeof compress.arrows === "undefined") {
			compress.arrows = false;
		}
	}

	/** @type {MinifyOptions} */
	const terserOptions = {
		...options,
		...(as === undefined ? undefined : { module: as === "module" }),
		compress,
		mangle:
			options.mangle === undefined || options.mangle === null
				? true
				: typeof options.mangle === "boolean"
					? options.mangle
					: { ...options.mangle },
		parse: { ...options.parse },
		format,
		// The plugin chains the asset's own map onto the one asked for here, so the
		// map it was handed is not read.
		sourceMap: sourceMap ? { asObject: true } : undefined
	};
	// `output` is terser's deprecated spelling of `format`, and naming both makes
	// it throw; whatever it carried is already merged above.
	delete (
		/** @type {MinifyOptions & { output?: FormatOptions }} */ (terserOptions)
			.output
	);

	const [[file, given]] = Object.entries(input);
	const code = typeof given === "string" ? given : given.toString("utf8");
	const handler = as === "event-handler";
	const result = await terser.minify(
		{ [file]: handler ? asFunction(code) : code },
		terserOptions
	);

	if (handler) {
		const body = functionBody(result.code);
		// A wrap moves every position, so the map terser wrote describes a script
		// that is not what comes back.
		return {
			code: body === undefined ? code : body,
			extractedComments: extracted
		};
	}

	return {
		code: /** @type {string} */ (result.code),
		map: result.map ? result.map : undefined,
		extractedComments: extracted
	};
};

// Worker-safe (see the body's in-worker `require`), so it may run in the shared
// worker-thread pool alongside cssMinify and htmlMinify.
jsMinify.supportsWorkerThreads = () => true;

/**
 * The version minified output is cached against, so an upgrade of terser
 * invalidates what it minified.
 * @returns {string | undefined} terser's version, or undefined when it is not installed
 */
jsMinify.getMinimizerVersion = () => {
	try {
		return require("terser/package.json").version;
	} catch (_err) {
		return undefined;
	}
};

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
jsMinify.filter = (name) => /\.[cm]?js(\?.*)?$/i.test(name);

module.exports = jsMinify;
