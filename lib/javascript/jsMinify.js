/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// cspell:ignore funs, fargs, fnames

/** @typedef {5 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025} Ecma the edition of ECMAScript the output may use */

/**
 * @typedef {object} ParseOptions
 * @property {boolean=} bare_returns whether a `return` may stand outside a function
 * @property {Ecma=} ecma unused: every edition is read
 * @property {boolean=} html5_comments whether `<!--` and `-->` start comments
 * @property {boolean=} shebang whether a leading `#!` line is kept
 */

/**
 * @typedef {object} CompressOptions
 * @property {boolean=} arguments whether `arguments[i]` becomes the parameter it reads
 * @property {boolean=} arrows whether functions become arrow functions where nothing changes
 * @property {boolean=} booleans_as_integers whether `true` and `false` become `1` and `0`
 * @property {boolean=} booleans whether boolean contexts are simplified
 * @property {boolean=} collapse_vars whether single-use variables are inlined
 * @property {boolean=} comparisons whether comparisons are simplified
 * @property {boolean=} computed_props whether constant computed keys become plain ones
 * @property {boolean=} conditionals whether `if` and `?:` are simplified
 * @property {boolean=} dead_code whether unreachable code is dropped
 * @property {boolean=} defaults whether the options default to on
 * @property {boolean=} directives whether redundant directives are dropped
 * @property {boolean | (keyof typeof console)[]=} drop_console whether calls to `console`, or to the methods named, are dropped
 * @property {boolean=} drop_debugger whether `debugger` statements are dropped
 * @property {Ecma=} ecma the edition the compressor may write
 * @property {Ecma=} builtins_ecma the edition whose built-ins it may assume
 * @property {boolean=} builtins_pure whether built-in calls count as pure
 * @property {boolean=} evaluate whether constant expressions are evaluated
 * @property {boolean=} expression whether the input is one expression
 * @property {Record<string, EXPECTED_ANY>=} global_defs the globals replaced by values
 * @property {boolean=} hoist_funs whether function declarations are hoisted
 * @property {boolean=} hoist_props whether object properties become variables
 * @property {boolean=} hoist_vars whether `var` declarations are hoisted
 * @property {boolean=} ie8 whether Internet Explorer 8 is supported
 * @property {boolean=} if_return whether `if` / `return` combinations are simplified
 * @property {boolean | 0 | 1 | 2 | 3=} inline how far functions are inlined
 * @property {boolean=} join_vars whether consecutive declarations are joined
 * @property {boolean | RegExp=} keep_classnames whether class names are kept
 * @property {boolean=} keep_fargs whether unused parameters are kept
 * @property {boolean | RegExp=} keep_fnames whether function names are kept
 * @property {boolean=} keep_infinity whether `Infinity` is kept as written
 * @property {boolean=} lhs_constants whether constants move to the left of comparisons
 * @property {boolean=} loops whether loops are simplified
 * @property {boolean=} module whether the input is a module
 * @property {boolean=} negate_iife whether an unused IIFE's result is negated
 * @property {number=} passes how many times to compress
 * @property {boolean=} properties whether `a["b"]` becomes `a.b`
 * @property {string[]=} pure_funcs the functions whose calls count as pure
 * @property {boolean=} pure_new whether `new` of a pure class counts as pure
 * @property {boolean | "strict"=} pure_getters whether reading a property counts as pure
 * @property {boolean=} reduce_funcs whether single-use functions are inlined
 * @property {boolean=} reduce_vars whether variables assigned constants are replaced
 * @property {boolean | number=} sequences whether statements are joined with commas, or at most how many
 * @property {boolean=} side_effects whether expressions without side effects are dropped
 * @property {boolean=} switches whether `switch` statements are simplified
 * @property {boolean=} toplevel whether top-level names may be dropped
 * @property {null | string | string[] | RegExp=} top_retain the top-level names kept
 * @property {boolean=} typeofs whether `typeof x == "undefined"` becomes `x === void 0`
 * @property {boolean=} unsafe_arrows whether functions not using `this` become arrows
 * @property {boolean=} unsafe whether transforms assuming built-ins are untouched are applied
 * @property {boolean=} unsafe_comps whether comparisons are reordered unsafely
 * @property {boolean=} unsafe_Function whether `Function(…)` with constant arguments is compressed
 * @property {boolean=} unsafe_math whether arithmetic is reordered unsafely
 * @property {boolean=} unsafe_symbols whether `Symbol("x")` descriptions may be dropped
 * @property {boolean=} unsafe_methods whether methods become arrow functions
 * @property {boolean=} unsafe_proto whether `Array.prototype.x` becomes `[].x`
 * @property {boolean=} unsafe_regexp whether regexps assigned to constants are inlined
 * @property {boolean=} unsafe_undefined whether `undefined` becomes a local variable
 * @property {boolean=} unused whether unused declarations are dropped
 */

/**
 * Where mangled names come from: the nth most favored name.
 * @typedef {object} IdentifierMangler
 * @property {(n: number) => string} get the nth name
 * @property {((chars: string, delta: number) => number)=} consider weighs characters, for a mangler that counts them
 * @property {(() => void)=} reset clears the weights
 * @property {(() => void)=} sort orders the names by the weights
 */

/**
 * @typedef {object} ManglePropertiesOptions
 * @property {boolean=} builtins whether the DOM's and built-ins' property names are mangled too
 * @property {boolean=} debug whether mangled names keep their originals
 * @property {boolean | "strict"=} keep_quoted whether quoted property names are kept
 * @property {IdentifierMangler=} nth_identifier where mangled names come from
 * @property {RegExp | string=} regex the property names mangled
 * @property {string[]=} reserved the property names kept
 */

/**
 * @typedef {object} MangleOptions
 * @property {boolean=} eval whether names in scopes using `eval` or `with` are mangled
 * @property {boolean | RegExp=} keep_classnames whether class names are kept
 * @property {boolean | RegExp=} keep_fnames whether function names are kept
 * @property {boolean=} module whether the input is a module
 * @property {IdentifierMangler=} nth_identifier where mangled names come from
 * @property {boolean | ManglePropertiesOptions=} properties whether, and which, property names are mangled
 * @property {string[]=} reserved the names kept
 * @property {boolean=} safari10 whether Safari 10's loop-scoping bug is worked around
 * @property {boolean=} toplevel whether top-level names are mangled
 */

/**
 * A comment as a `comments` predicate is handed it.
 * @typedef {object} Comment
 * @property {string} value its text
 * @property {"comment1" | "comment2" | "comment3" | "comment4"} type `//`, `/*`, `<!--` or `-->`
 * @property {number} pos its offset
 * @property {number} line its line
 * @property {number} col its column
 */

/**
 * @typedef {object} SourceMapOptions
 * @property {import("webpack-sources").RawSourceMap | string=} content the input's own map, `"inline"` to read it from the input
 * @property {boolean=} includeSources whether the map carries the sources
 * @property {string=} filename the output's name
 * @property {string=} root the sources' root
 * @property {boolean=} asObject whether the map is returned as an object
 * @property {string=} url where the output says its map is, `"inline"` to inline it
 */

/**
 * The output's options. Only those changing the code written count: the output
 * is always minified, so layout options are read and left unused.
 * @typedef {object} FormatOptions
 * @property {boolean=} ascii_only whether non-ASCII characters are escaped
 * @property {boolean=} beautify unused
 * @property {boolean=} braces unused
 * @property {boolean | "all" | "some" | RegExp | ((node: EXPECTED_ANY, comment: Comment) => boolean)=} comments which comments are kept
 * @property {Ecma=} ecma the edition the output may use
 * @property {boolean=} ie8 whether Internet Explorer 8 is supported
 * @property {boolean=} keep_numbers whether numbers are written as in the input
 * @property {number=} indent_level unused
 * @property {number=} indent_start unused
 * @property {boolean=} inline_script whether `</script` is escaped
 * @property {boolean=} keep_quoted_props whether quoted property names stay quoted
 * @property {number | false=} max_line_len unused
 * @property {string=} preamble text written before the output
 * @property {boolean=} preserve_annotations whether `#__PURE__` and similar comments are kept
 * @property {boolean=} quote_keys whether every property name is quoted
 * @property {0 | 1 | 2 | 3=} quote_style which quotes strings take
 * @property {boolean=} safari10 whether Safari 10's bugs are worked around
 * @property {boolean=} semicolons unused
 * @property {boolean=} shebang whether a leading `#!` line is kept
 * @property {boolean=} shorthand whether object shorthand may be written
 * @property {SourceMapOptions=} source_map the source map written
 * @property {boolean=} webkit whether WebKit's bugs are worked around
 * @property {number=} width unused
 * @property {boolean=} wrap_iife whether an immediately invoked function is wrapped in parentheses
 * @property {boolean=} wrap_func_args whether function arguments are wrapped in parentheses
 */

/**
 * The options of webpack's JavaScript minifier, which are terser's.
 * @typedef {object} MinifyOptions
 * @property {boolean | CompressOptions=} compress whether, and how, the code is compressed
 * @property {Ecma=} ecma the edition the output may use
 * @property {boolean | string=} enclose whether the output is wrapped in a function, and its parameters and arguments
 * @property {boolean=} ie8 whether Internet Explorer 8 is supported
 * @property {boolean | RegExp=} keep_classnames whether class names are kept
 * @property {boolean | RegExp=} keep_fnames whether function names are kept
 * @property {boolean | MangleOptions=} mangle whether, and how, names are mangled
 * @property {boolean=} module whether the input is a module
 * @property {Record<string, EXPECTED_ANY>=} nameCache the mangled names, read and updated across calls
 * @property {FormatOptions=} format the output's options
 * @property {FormatOptions=} output the deprecated spelling of `format`
 * @property {ParseOptions=} parse the parser's options
 * @property {boolean=} safari10 whether Safari 10's bugs are worked around
 * @property {boolean | SourceMapOptions=} sourceMap whether, and how, a source map is written
 * @property {boolean=} toplevel whether top-level names are mangled and may be dropped
 */

/**
 * @typedef {object} MinifyOutput
 * @property {string=} code the minified code
 * @property {import("webpack-sources").RawSourceMap | string=} map its source map
 * @property {Record<string, EXPECTED_ANY> | null=} decoded_map its source map, its mappings decoded
 */

/** @typedef {(files: string | string[] | Record<string, string>, options?: MinifyOptions) => Promise<MinifyOutput>} Minify webpack's JavaScript minifier */

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
 * option): minifies one JavaScript asset with webpack's printer, so JavaScript
 * minification reuses that plugin's pipeline — source maps, caching and
 * worker-thread parallelization.
 *
 * The printer is read inside the body rather than imported at module scope:
 * `minimizer-webpack-plugin` ships this function to its worker pool as source,
 * where this module's own scope is gone.
 * @param {{ [file: string]: string | Buffer }} input a single `{ filename: code }` entry; a `Buffer` is read as UTF-8
 * @param {object=} sourceMap the asset's input source map — the plugin chains it onto the map returned here, so it isn't read directly
 * @param {(MinifyOptions & { as?: JavascriptProduction, printer?: boolean })=} minimizerOptions `optimization.minimize.javascript`, as terser names its options; `as` names the production the source is written in, which is the source's own rather than the configuration's, and `printer` is read and left unused
 * @param {ExtractCommentsOption=} extractComments which comments to move into a separate file
 * @returns {Promise<{ code: string, map?: MinifyOutput["map"], extractedComments?: string[], errors?: Error[] }>} the minified code, its input->output source map, and the comments taken out of it
 */
const jsMinify = async (
	input,
	sourceMap,
	minimizerOptions,
	extractComments
) => {
	// TODO in the next major release: remove, `printer` chose between the printer and terser
	const { as, printer: _printer, ...options } = minimizerOptions || {};
	/** @type {{ minify: Minify }} */
	let minifier;
	try {
		const webpack =
			/** @type {typeof import("../index")} */
			(
				// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
				require(/** @type {string} */ ("webpack"))
			);

		minifier = await webpack.javascript.syntax.printer.load();
	} catch (err) {
		return { code: "", errors: [/** @type {Error} */ (err)] };
	}

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

	const format = { beautify: false, ...options.format, ...options.output };
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
		// The minifier reads `ecma` per option group, and its compressor is the one that
		// would otherwise write syntax the asset's own `ecma` excludes.
		if (typeof compress.ecma === "undefined") compress.ecma = options.ecma;
		// https://github.com/webpack/webpack/issues/16135
		if (options.ecma === 5 && typeof compress.arrows === "undefined") {
			compress.arrows = false;
		}
	}

	/** @type {MinifyOptions} */
	const minifyOptions = {
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
		/** @type {MinifyOptions & { output?: FormatOptions }} */ (minifyOptions)
			.output
	);

	const [[file, given]] = Object.entries(input);
	const code = typeof given === "string" ? given : given.toString("utf8");
	const handler = as === "event-handler";
	const result = await minifier.minify(
		{ [file]: handler ? asFunction(code) : code },
		minifyOptions
	);

	if (handler) {
		const body = functionBody(result.code);
		// A wrap moves every position, so the map the minifier wrote describes a script
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
 * The version minified output is cached against, so an upgrade of webpack,
 * whose printer minifies, invalidates what it minified.
 * @returns {string | undefined} webpack's version
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
