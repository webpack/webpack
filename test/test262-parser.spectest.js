"use strict";

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const JavascriptParser = require("../lib/javascript/JavascriptParser");

/** @typedef {{ file: string, at: string, ours: string, acorn: string }} TreeDifference */
/** @typedef {{ file: string, parsedBy: string, message: string }} VerdictDifference */
/** @typedef {{ ranges?: boolean, locations?: boolean, comments?: boolean }} Mode */
/** @typedef {import("acorn").Program} Program */
/** @typedef {import("acorn").Comment} Comment */
/** @typedef {import("../lib/javascript/JavascriptParser").ParseResult} ParseResult */

const corpusDir = path.resolve(__dirname, "./test262-cases/test");
const hasCorpus =
	fs.existsSync(corpusDir) && fs.readdirSync(corpusDir).length > 0;

// Every area is parsed twice per mode, and coverage instrumentation makes the
// parser several times slower, so jest's default 30s is far too tight.
const AREA_TIMEOUT = 600000;
// Enough of a regression to see its shape without flooding the log.
const MAX_REPORTED = 10;

// The option sets a caller can hand `JavascriptParser._parse`. `ranges` is the
// one webpack itself uses: it switches on the lazy-node path.
/** @type {[string, Mode][]} */
const MODES = [
	["without ranges or comments", {}],
	["with ranges and comments", { ranges: true, comments: true }],
	["with locations", { locations: true }]
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
 * A value as it reads in a difference report, kept short enough to scan.
 * @param {unknown} value either parser's value at the differing path
 * @returns {string} how the value prints
 */
const show = (value) => {
	if (typeof value === "bigint") return `${value}n`;
	if (value instanceof RegExp) return String(value);
	if (typeof value === "object" && value !== null) {
		return Array.isArray(value)
			? `[${value.length} items]`
			: `{${Object.keys(value).sort().join(",")}}`;
	}
	return JSON.stringify(value) || String(value);
};

/**
 * The first place two parse trees disagree, or null when they match. Key
 * presence is asked with `in`, since the lazy path serves `range` from a
 * prototype getter rather than an own property.
 * @param {unknown} ours what webpack's parser built
 * @param {unknown} theirs what acorn built
 * @param {string} at the path walked so far
 * @returns {{ at: string, ours: string, acorn: string } | null} the difference
 */
const firstDifference = (ours, theirs, at) => {
	if (ours === theirs) return null;
	const report = { at, ours: show(ours), acorn: show(theirs) };
	if (typeof ours !== typeof theirs) return report;
	if (typeof ours === "number") {
		return Number.isNaN(ours) && Number.isNaN(/** @type {number} */ (theirs))
			? null
			: report;
	}
	if (typeof ours === "bigint") {
		return String(ours) === String(theirs) ? null : report;
	}
	if (typeof ours !== "object" || ours === null || theirs === null) {
		return report;
	}
	if (ours instanceof RegExp || theirs instanceof RegExp) {
		return String(ours) === String(theirs) ? null : report;
	}
	if (Array.isArray(ours) !== Array.isArray(theirs)) return report;
	if (Array.isArray(ours)) {
		const other = /** @type {unknown[]} */ (theirs);
		if (ours.length !== other.length) return report;
		for (let i = 0; i < ours.length; i++) {
			const difference = firstDifference(ours[i], other[i], `${at}[${i}]`);
			if (difference) return difference;
		}
		return null;
	}
	const left = /** @type {Record<string, unknown>} */ (ours);
	const right = /** @type {Record<string, unknown>} */ (theirs);
	const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
	for (const key of [...keys].sort()) {
		if (!(key in left)) {
			return { at: `${at}.${key}`, ours: "absent", acorn: show(right[key]) };
		}
		if (!(key in right)) {
			return { at: `${at}.${key}`, ours: show(left[key]), acorn: "absent" };
		}
		const difference = firstDifference(left[key], right[key], `${at}.${key}`);
		if (difference) return difference;
	}
	return null;
};

/**
 * Whether acorn only got through the file because the host engine cannot build
 * one of its regexp literals, which acorn records as a null value and webpack
 * (validating with `new RegExp`) reports as a parse error instead.
 * @param {Error} error what webpack's parser threw
 * @param {Program} ast the program acorn built
 * @returns {boolean} true when the engine, not the pattern, is the difference
 */
const isHostRegExpLimit = (error, ast) => {
	if (!error.message.startsWith("Invalid regular expression:")) {
		return false;
	}
	/** @type {unknown[]} */
	const queue = [ast];
	while (queue.length > 0) {
		const node = queue.pop();
		if (typeof node !== "object" || node === null) continue;
		const record = /** @type {Record<string, unknown>} */ (node);
		if (record.regex !== undefined && record.value === null) return true;
		for (const key of Object.keys(record)) queue.push(record[key]);
	}
	return false;
};

/**
 * Parse one file with both parsers and record how they disagreed.
 * @param {string} file absolute path of the test262 file
 * @param {Mode} mode the options both parsers are given
 * @param {TreeDifference[]} trees where tree differences are collected
 * @param {VerdictDifference[]} verdicts where accept/reject differences are collected
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

	if (ourError !== undefined || theirError !== undefined) {
		if (ourError !== undefined && theirError !== undefined) return;
		if (
			ourError !== undefined &&
			theirs !== undefined &&
			isHostRegExpLimit(ourError, theirs)
		) {
			return;
		}
		verdicts.push({
			file: name,
			parsedBy: ourError === undefined ? "webpack" : "acorn",
			message: /** @type {Error} */ (ourError || theirError).message
		});
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

/**
 * The first few differences, with a count when more were found.
 * @template T
 * @param {T[]} differences everything the run collected
 * @returns {(T | string)[]} what the assertion prints
 */
const reportable = (differences) =>
	differences.length > MAX_REPORTED
		? [
				...differences.slice(0, MAX_REPORTED),
				`…and ${differences.length - MAX_REPORTED} more`
			]
		: differences;

const areas = hasCorpus
	? fs
			.readdirSync(corpusDir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort()
	: [];

describe("test262 parser parity", () => {
	if (!hasCorpus) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/test262-cases`)", () => {
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
