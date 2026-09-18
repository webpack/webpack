"use strict";

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const JavascriptParser = require("../../lib/javascript/JavascriptParser");
const {
	firstDifference,
	reportable
} = require("../helpers/compareParserOutput");

/** @typedef {{ file: string, at: string, ours: string, acorn: string }} TreeDifference */
/** @typedef {{ file: string, webpack: string, acorn: string }} VerdictDifference */
/** @typedef {{ ranges?: boolean, locations?: boolean, comments?: boolean }} Mode */
/** @typedef {import("acorn").Program} Program */
/** @typedef {import("acorn").Comment} Comment */
/** @typedef {import("../../lib/javascript/JavascriptParser").ParseResult} ParseResult */

const corpusDir = path.resolve(__dirname, "../external/test262-cases/test");
const hasCorpus =
	fs.existsSync(corpusDir) && fs.readdirSync(corpusDir).length > 0;

// Every area is parsed twice per mode, and coverage instrumentation makes the
// parser several times slower, so jest's default 30s is far too tight.
const AREA_TIMEOUT = 600000;

// The option sets a caller can hand `JavascriptParser._parse`. Ranges alone is
// the one webpack uses, and the only one that takes the lazy-node path.
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
		ours = JavascriptParser._parse(code, { ...options });
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
			// `_parse` sets this from the goal symbol, so acorn has to match
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

			for (const [modeName, mode] of MODES) {
				it(
					`builds acorn's tree ${modeName}`,
					() => {
						/** @type {TreeDifference[]} */
						const trees = [];
						/** @type {VerdictDifference[]} */
						const verdicts = [];
						for (const file of files) {
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
