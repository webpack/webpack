"use strict";

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const {
	parse,
	parseProgram,
	toEstreeObject
} = require("../../lib/javascript/syntax").parser;
const {
	firstDifference,
	reportable
} = require("../../tooling/compare-js-tools");
const { isInPart } = require("../helpers/testParts");

/** @typedef {{ file: string, at: string, ours: string, acorn: string }} TreeDifference */
/** @typedef {{ file: string, webpack: string, acorn: string }} VerdictDifference */
/** @typedef {{ ranges?: boolean, locations?: boolean, comments?: boolean }} Mode */
/** @typedef {import("acorn").Program} Program */
/** @typedef {import("acorn").Comment} Comment */
/** @typedef {import("../../lib/javascript/syntax-parser").ParserOptions} ParserOptions */
/** @typedef {import("../../lib/javascript/syntax-parser").CollectedComment} CollectedComment */
/** @typedef {{ ast: import("estree").Program, comments: CollectedComment[] }} ParseResult */
/** @typedef {import("../../lib/javascript/syntax-parser").EcmaVersion} EcmaVersion */
/** @typedef {string | number | boolean | bigint | RegExp | null | undefined | EstreeValue[] | { [key: string]: EstreeValue }} EstreeValue */

const corpusDir = path.resolve(__dirname, "../external/test262-cases/test");
const hasCorpus =
	fs.existsSync(corpusDir) && fs.readdirSync(corpusDir).length > 0;

// Every area is parsed twice per mode, and coverage instrumentation makes the
// parser several times slower, so jest's default 30s is far too tight.
const AREA_TIMEOUT = 600000;

// The option sets compared against acorn. Ranges alone is the one webpack
// uses, and the only one that takes the lazy-node path.
/** @type {[string, Mode][]} */
const MODES = [
	["without ranges or comments", {}],
	["with ranges and comments", { ranges: true, comments: true }],
	["with locations", { locations: true }],
	[
		"with ranges, locations and comments",
		{ ranges: true, locations: true, comments: true }
	]
];

/**
 * The `sourceType` a test262 file is written for, which its `flags` declare.
 * @param {string} code the file's source
 * @returns {"module" | "script"} the goal symbol to parse it as
 */
const sourceTypeOf = (code) => {
	const meta = /\/\*---([\s\S]*?)---\*\//.exec(code);
	if (!meta) return "script";
	const flags = /flags:\s*\[([^\]]*)\]/.exec(meta[1]);
	if (!flags) return "script";
	return flags[1].split(",").some((flag) => flag.trim() === "module")
		? "module"
		: "script";
};

/**
 * Parse with webpack's parser the way a build hands it options: ranges alone
 * become lazy offsets, with comments collected lazily alongside.
 * @param {string} code the source
 * @param {Mode & { sourceType: "module" | "script", ecmaVersion: "latest", allowHashBang: boolean }} options what acorn is given too
 * @returns {ParseResult} the program and its comments
 */
const parseOurs = (code, { comments: collectComments, ...options }) => {
	/** @type {CollectedComment[]} */
	const comments = [];
	const lazyNodes = options.ranges === true && options.locations !== true;
	/** @type {ParserOptions} */
	const parserOptions = {
		...options,
		allowReturnOutsideFunction: options.sourceType === "script",
		ranges: lazyNodes ? false : options.ranges,
		lazyNodes
	};
	if (collectComments === true) {
		if (lazyNodes) parserOptions.lazyComments = comments;
		else parserOptions.onComment = comments;
	}
	return { ast: parse(code, parserOptions), comments };
};

/**
 * Parse one file with both parsers and record how they disagreed.
 * @param {string} file absolute path of the test262 file
 * @param {Mode} mode the options both parsers are given
 * @param {TreeDifference[]} trees where tree differences are collected
 * @param {VerdictDifference[]} verdicts where verdicts that disagree are collected
 * @returns {void}
 */
const compareFile = (file, mode, trees, verdicts) => {
	const code = fs.readFileSync(file, "utf8");
	const sourceType = sourceTypeOf(code);
	const name = path.relative(corpusDir, file);
	const options = {
		sourceType,
		ecmaVersion: /** @type {const} */ ("latest"),
		allowHashBang: true,
		...mode
	};

	/** @type {ParseResult | undefined} */
	let ours;
	/** @type {Error | undefined} */
	let ourError;
	try {
		ours = parseOurs(code, options);
	} catch (err) {
		ourError = /** @type {Error} */ (err);
	}

	/** @type {Comment[]} */
	const comments = [];
	/** @type {Program | undefined} */
	let theirs;
	/** @type {Error | undefined} */
	let theirError;
	try {
		theirs = acorn.parse(code, {
			...options,
			// `parseOurs` sets this from the goal symbol, so acorn has to match
			allowReturnOutsideFunction: sourceType === "script",
			...(mode.comments === true ? { onComment: comments } : {})
		});
	} catch (err) {
		theirError = /** @type {Error} */ (err);
	}

	// Rejecting the same source is half of the contract; rejecting it in the
	// same words is the other half, since webpack reports what the parser threw.
	if (ourError !== undefined || theirError !== undefined) {
		const webpackVerdict = ourError === undefined ? "parsed" : ourError.message;
		const acornVerdict =
			theirError === undefined ? "parsed" : theirError.message;
		if (webpackVerdict !== acornVerdict) {
			verdicts.push({
				file: name,
				webpack: webpackVerdict,
				acorn: acornVerdict
			});
		}
		return;
	}

	const tree = firstDifference(
		/** @type {ParseResult} */ (ours).ast,
		theirs,
		"program"
	);
	if (tree) trees.push({ file: name, ...tree });
	if (mode.comments !== true) return;
	const commentDifference = firstDifference(
		/** @type {ParseResult} */ (ours).comments,
		comments,
		"comments"
	);
	if (commentDifference) trees.push({ file: name, ...commentDifference });
};

// Every edition a tree is read at: each changes a production somewhere.
/** @type {EcmaVersion[]} */
const EDITIONS = [3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, "latest"];
// The areas whose syntax tells editions apart; the others read at the latest.
const EDITION_AREAS = new Set(["annexB", "language"]);
// What acorn's objects carry only from the edition that added it, which
// `toEstreeObject` writes on every edition's objects as the latest's.
const LATER_EDITION_FIELDS = new Set([
	"async",
	"attributes",
	"await",
	"bigint",
	"computed",
	"directive",
	"exported",
	"expression",
	"generator",
	"kind",
	"method",
	"optional",
	"options",
	"phase",
	"shorthand",
	"static"
]);

/**
 * Our object with the fields a later edition added left out where acorn's,
 * read at an earlier edition, lacks them.
 * @param {EstreeValue} ours what `toEstreeObject` built
 * @param {EstreeValue} theirs what acorn built
 * @returns {EstreeValue} ours, as acorn reads its edition
 */
const atEdition = (ours, theirs) => {
	if (
		ours === null ||
		typeof ours !== "object" ||
		ours instanceof RegExp ||
		theirs === null ||
		typeof theirs !== "object" ||
		theirs instanceof RegExp
	) {
		return ours;
	}
	if (Array.isArray(ours)) {
		return ours.map((item, index) =>
			atEdition(item, Array.isArray(theirs) ? theirs[index] : undefined)
		);
	}
	if (Array.isArray(theirs)) return ours;
	/** @type {{ [key: string]: EstreeValue }} */
	const read = {};
	for (const key in ours) {
		if (LATER_EDITION_FIELDS.has(key) && !(key in theirs)) continue;
		read[key] = atEdition(ours[key], theirs[key]);
	}
	// `range` is read through a getter `for...in` does not list
	if ("range" in ours) read.range = ours.range;
	return read;
};

/**
 * Read one file into a `SyntaxTree` at one edition, build its objects, and
 * record how they and the verdict differ from acorn's at that edition.
 * @param {string} file absolute path of the test262 file
 * @param {EcmaVersion} ecmaVersion the edition both parsers read
 * @param {TreeDifference[]} trees where tree differences are collected
 * @param {VerdictDifference[]} verdicts where verdicts that disagree are collected
 * @returns {void}
 */
const compareTreeFile = (file, ecmaVersion, trees, verdicts) => {
	const code = fs.readFileSync(file, "utf8");
	const sourceType = sourceTypeOf(code);
	// a module is no source before ES2015
	if (
		sourceType === "module" &&
		typeof ecmaVersion === "number" &&
		ecmaVersion < 6
	) {
		return;
	}
	const name = path.relative(corpusDir, file);
	const options = {
		ecmaVersion,
		sourceType,
		allowHashBang: true,
		allowReturnOutsideFunction: sourceType === "script"
	};
	/** @type {EstreeValue} */
	let ours;
	/** @type {Error | undefined} */
	let ourError;
	try {
		ours = /** @type {EstreeValue} */ (
			/** @type {unknown} */ (
				toEstreeObject(parseProgram(code, 0, { ...options, importPhases: false }))
			)
		);
	} catch (err) {
		ourError = /** @type {Error} */ (err);
	}
	/** @type {Program | undefined} */
	let theirs;
	/** @type {Error | undefined} */
	let theirError;
	try {
		theirs = acorn.parse(code, { ...options, ranges: true });
	} catch (err) {
		theirError = /** @type {Error} */ (err);
	}
	if (ourError !== undefined || theirError !== undefined) {
		const webpackVerdict = ourError === undefined ? "parsed" : ourError.message;
		const acornVerdict =
			theirError === undefined ? "parsed" : theirError.message;
		if (webpackVerdict !== acornVerdict) {
			verdicts.push({ file: name, webpack: webpackVerdict, acorn: acornVerdict });
		}
		return;
	}
	const read = /** @type {EstreeValue} */ (/** @type {unknown} */ (theirs));
	const tree = firstDifference(atEdition(ours, read), theirs, "program");
	if (tree) trees.push({ file: name, ...tree });
};

const areas = hasCorpus
	? fs
			.readdirSync(corpusDir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort()
	: [];

describe("test262 parser parity", () => {
	if (!hasCorpus) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/external/test262-cases`)", () => {
			// No-op: the conformance corpus is an optional git submodule.
		});

		return;
	}

	for (const area of areas) {
		describe(area, () => {
			const files = fs
				.globSync(`${corpusDir}/${area}/**/*.js`)
				.filter((file) => !/_FIXTURE\.js$/i.test(file))
				.sort();

			for (const ecmaVersion of EDITION_AREAS.has(area)
				? EDITIONS
				: /** @type {EcmaVersion[]} */ (["latest"])) {
				it(
					`builds acorn's tree from a SyntaxTree read at ${ecmaVersion}`,
					() => {
						/** @type {TreeDifference[]} */
						const trees = [];
						/** @type {VerdictDifference[]} */
						const verdicts = [];
						for (const file of files) {
							if (!isInPart(path.relative(corpusDir, file))) continue;
							compareTreeFile(file, ecmaVersion, trees, verdicts);
						}
						expect(reportable(trees)).toEqual([]);
						expect(reportable(verdicts)).toEqual([]);
					},
					AREA_TIMEOUT
				);
			}

			for (const [modeName, mode] of MODES) {
				it(
					`builds acorn's tree ${modeName}`,
					() => {
						/** @type {TreeDifference[]} */
						const trees = [];
						/** @type {VerdictDifference[]} */
						const verdicts = [];
						for (const file of files) {
							if (!isInPart(path.relative(corpusDir, file))) continue;
							compareFile(file, mode, trees, verdicts);
						}
						expect(files.length).toBeGreaterThan(0);
						expect(reportable(trees)).toEqual([]);
						expect(reportable(verdicts)).toEqual([]);
					},
					AREA_TIMEOUT
				);
			}
		});
	}
});
