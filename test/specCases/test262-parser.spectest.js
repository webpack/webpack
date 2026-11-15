"use strict";

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const {
	parseProgram,
	toEstreeObject
} = require("../../lib/javascript/syntax").parser;
const {
	firstDifference,
	reportable
} = require("../../tooling/compare-js-tools");
const { parseEstree } = require("../helpers/javascriptParse");
const { isInPart } = require("../helpers/testParts");

/** @typedef {{ file: string, at: string, ours: string, acorn: string }} TreeDifference */
/** @typedef {{ file: string, webpack: string, acorn: string }} VerdictDifference */
/** @typedef {{ ranges?: boolean, locations?: boolean, comments?: boolean }} Mode */
/** @typedef {import("acorn").Program} Program */
/** @typedef {import("acorn").Comment} Comment */
/** @typedef {import("../helpers/javascriptParse").AcornComment} AcornComment */
/** @typedef {{ ast: import("estree").Program, comments: AcornComment[] }} ParseResult */
/** @typedef {import("../../lib/javascript/syntax-parser").EcmaVersion} EcmaVersion */
/** @typedef {string | number | boolean | bigint | RegExp | null | undefined | EstreeValue[] | { [key: string]: EstreeValue }} EstreeValue */

const corpusDir = path.resolve(__dirname, "../external/test262-cases/test");
const hasCorpus =
	fs.existsSync(corpusDir) && fs.readdirSync(corpusDir).length > 0;

// Every area is parsed twice per mode, and coverage instrumentation makes the
// parser several times slower, so jest's default 30s is far too tight.
const AREA_TIMEOUT = 600000;

// The option sets compared against acorn: what the objects a tree builds hold
// beside ESTree's fields, and whether comments are collected.
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
 * Parse into a syntax tree and build its objects with what the mode asks for,
 * its comments reported as acorn reports them.
 * @param {string} code the source
 * @param {Mode & { sourceType: "module" | "script", ecmaVersion: "latest", allowHashBang: boolean }} options what acorn is given too
 * @returns {ParseResult} the program and its comments
 */
const parseOurs = (code, { comments: collectComments, ...options }) => {
	/** @type {AcornComment[]} */
	const comments = [];
	const { ast } = parseEstree(code, {
		...options,
		allowReturnOutsideFunction: options.sourceType === "script",
		onComment: collectComments === true ? comments : undefined
	});
	return { ast, comments };
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
	const tree = firstDifference(ours, theirs, "program");
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
