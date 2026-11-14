"use strict";

/** @typedef {import("../../lib/javascript/syntax-parser").CollectedComment} CollectedComment */
/** @typedef {import("../../lib/javascript/syntax-parser").JavascriptParseOptions} JavascriptParseOptions */
/** @typedef {import("../../lib/javascript/syntax-parser").EcmaVersion} EcmaVersion */
/** @typedef {import("../../lib/javascript/syntax-parser").Token} Token */
/** @typedef {import("../../lib/javascript/syntax-parser").Position} Position */
/** @typedef {import("../../lib/javascript/syntax-parser").ParserSourceLocation} Location */
/** @typedef {{ type: "Block" | "Line", value: string, start: number, end: number, loc?: Location, range?: [number, number] }} AcornComment */
/** @typedef {(end: number, loc?: Position) => void} AcornOnPunctuation */
/** @typedef {(block: boolean, text: string, start: number, end: number, startLoc?: Position, endLoc?: Position) => void} AcornOnComment */
/**
 * The options acorn's `parse` takes: `parseProgram`'s, what the objects hold
 * beside ESTree's fields, and comments and tokens reported as acorn reports them.
 * @typedef {Omit<JavascriptParseOptions, "onComment" | "onToken" | "comments" | "onInsertedSemicolon" | "onTrailingComma"> & { ranges?: boolean, locations?: boolean, sourceFile?: string, comments?: boolean, onComment?: AcornComment[] | AcornOnComment, onToken?: Token[] | ((token: Token) => void), onInsertedSemicolon?: AcornOnPunctuation, onTrailingComma?: AcornOnPunctuation }} EstreeParseOptions
 */
/** @typedef {{ ast: import("estree").Program, comments: CollectedComment[] }} ParseResult */

const { ParserSourceLocation, getLineInfo, parseProgram, toEstreeObject } =
	require("../../lib/javascript/syntax").parser;

/**
 * @param {string} code the source
 * @param {number} start where it starts
 * @param {number} end where it ends
 * @param {string | undefined} sourceFile what the location names as its source
 * @returns {Location} the lines and columns it spans, as acorn's `loc`
 */
const locationOf = (code, start, end, sourceFile) =>
	new ParserSourceLocation(
		{ sourceFile: sourceFile === undefined ? null : sourceFile },
		getLineInfo(code, start),
		getLineInfo(code, end)
	);

/**
 * Parse into a syntax tree and build its ESTree objects, as acorn's `parse`
 * builds them with the same options: the program, its comments and tokens.
 * @param {string} code the source
 * @param {EstreeParseOptions=} options what to read it as, and what the objects hold
 * @returns {{ ast: import("estree").Program, comments: CollectedComment[] }} the program and the comments `comments: true` collected
 */
const parseEstree = (code, options = {}) => {
	const {
		ranges,
		locations,
		sourceFile,
		comments: collectComments,
		onComment,
		onToken,
		onInsertedSemicolon,
		onTrailingComma,
		ecmaVersion = "latest",
		sourceType = "script",
		...rest
	} = options;
	/** @type {CollectedComment[]} */
	const comments = [];
	const edition =
		ecmaVersion === "latest"
			? 1e8
			: ecmaVersion >= 2015
				? ecmaVersion - 2009
				: ecmaVersion;
	/** @type {JavascriptParseOptions} */
	const parseOptions = {
		importPhases: false,
		allowHashBang: edition >= 14,
		...rest,
		sourceType,
		ecmaVersion,
		comments: collectComments === true ? comments : undefined
	};
	if (onComment !== undefined) {
		parseOptions.onComment = (block, text, start, end) => {
			if (typeof onComment === "function") {
				onComment(
					block,
					text,
					start,
					end,
					locations ? getLineInfo(code, start) : undefined,
					locations ? getLineInfo(code, end) : undefined
				);
				return;
			}
			/** @type {AcornComment} */
			const reported = {
				type: block ? "Block" : "Line",
				value: text,
				start,
				end
			};
			if (locations) reported.loc = locationOf(code, start, end, sourceFile);
			if (ranges) reported.range = [start, end];
			onComment.push(reported);
		};
	}
	if (onToken !== undefined) {
		parseOptions.onToken = (token) => {
			const reported =
				/** @type {Token & { loc?: Location, range?: [number, number] }} */ (
					token
				);
			if (locations) {
				reported.loc = locationOf(code, token.start, token.end, sourceFile);
			}
			if (ranges) reported.range = [token.start, token.end];
			if (typeof onToken === "function") onToken(reported);
			else onToken.push(reported);
		};
	}
	if (onInsertedSemicolon !== undefined) {
		parseOptions.onInsertedSemicolon = (end) =>
			onInsertedSemicolon(end, locations ? getLineInfo(code, end) : undefined);
	}
	if (onTrailingComma !== undefined) {
		parseOptions.onTrailingComma = (end) =>
			onTrailingComma(end, locations ? getLineInfo(code, end) : undefined);
	}
	/** @type {number} */
	let program;
	try {
		program = /** @type {number} */ (parseProgram(code, 0, parseOptions));
	} catch (err) {
		// acorn names the file in a syntax error's message
		if (sourceFile !== undefined && err instanceof SyntaxError) {
			err.message += ` in ${sourceFile}`;
		}
		throw err;
	}
	const ast = /** @type {import("estree").Program} */ (
		toEstreeObject(program, { ecmaVersion, ranges, locations, sourceFile })
	);
	return { ast, comments };
};

/**
 * Parse with the options a build hands the parser: ranges, and comments
 * collected as the parse reads them.
 * @param {string} code source
 * @param {EstreeParseOptions=} options extra parse options, plus `comments` to collect them
 * @returns {ParseResult} result
 */
const parse = (code, options) => {
	const { sourceType = "script", ...rest } = options || {};
	return parseEstree(code, {
		comments: true,
		ranges: true,
		allowHashBang: true,
		allowReturnOutsideFunction: sourceType === "script",
		sourceType,
		...rest
	});
};

/**
 * @param {string} code source
 * @param {EstreeParseOptions=} options what acorn's `parse` would be given
 * @returns {import("estree").Program} the program, as acorn builds it
 */
const estree = (code, options) => parseEstree(code, options).ast;

/**
 * A tree, token, comment or error as plain data, so acorn's and ours compare by value.
 * @param {unknown} value what to convert
 * @returns {unknown} the plain data
 */
const plain = (value) =>
	JSON.parse(
		JSON.stringify(value, (key, v) => {
			if (typeof v === "bigint") return `${v}n`;
			if (v instanceof RegExp) return { regexp: v.source, flags: v.flags };
			if (key === "type" && v && typeof v === "object" && "label" in v) {
				return { label: v.label };
			}
			return v;
		})
	);

module.exports = { estree, parse, parseEstree, plain };
