/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const fs = require("fs");
const fc = require("fast-check");
const { invariantFindings } = require("./syntaxInvariants");

/** @import { InvariantFinding, SyntaxInvariants } from "./syntaxInvariants/index.js" */

/**
 * A finding the syntax is known to report on some generated sources.
 * @typedef {object} KnownFinding
 * @property {string} relation the relation it breaks
 * @property {string} contains text its repro holds
 * @property {string[]=} presets the presets it shows under, every one where absent
 * @property {((source: string) => boolean)=} when whether the source it shows in is one it explains, every source where absent
 * @property {string} why why it is no bug
 */

/**
 * The options one fuzz run takes.
 * @typedef {object} FuzzOptions
 * @property {readonly KnownFinding[]=} known findings that are no bug
 * @property {number=} maxLength the most pieces one source joins
 */

/**
 * The seed CI replays; `FUZZ_SEED` picks another and `FUZZ_RUNS` searches longer.
 */
const SEED = 7;
const RUNS = 1000;

/**
 * @param {string | undefined} value an environment variable
 * @param {number} fallback what an unset variable means
 * @returns {number} the number it holds
 */
const numberFrom = (value, fallback) => {
	if (value === undefined || value === "") return fallback;
	const number = Number(value);
	if (!Number.isInteger(number)) {
		throw new Error(`Expected an integer, got ${JSON.stringify(value)}`);
	}
	return number;
};

/**
 * @param {string} source the generated source the findings are for
 * @param {readonly InvariantFinding[]} findings what broke
 * @param {readonly KnownFinding[]} known findings that are no bug
 * @returns {string[]} each finding no known entry explains
 */
const unexplainedFindings = (source, findings, known) => {
	/** @type {string[]} */
	const left = [];
	for (const { preset, report } of findings) {
		const explained = known.some(
			(entry) =>
				entry.relation === report.relation &&
				report.repro.includes(entry.contains) &&
				(entry.presets === undefined || entry.presets.includes(preset)) &&
				(entry.when === undefined || entry.when(source))
		);
		if (!explained) {
			left.push(
				`${report.relation} [${preset}] ${report.what}\n${report.repro}`
			);
		}
	}
	return left;
};

/**
 * What a generated source broke that no known finding explains.
 */
class FindingsError extends Error {
	/**
	 * @param {string[]} findings each unexplained finding
	 */
	constructor(findings) {
		super(findings.join("\n\n"));
		this.name = "FindingsError";
	}
}

/**
 * @param {string} text what a Markdown code block shows
 * @returns {string} the block, its fence longer than any backtick run inside
 */
const codeBlock = (text) => {
	const runs = text.match(/`+/g) || [];
	const longest = Math.max(2, ...runs.map((run) => run.length));
	const fence = "`".repeat(longest + 1);
	return `${fence}\n${text}\n${fence}`;
};

/**
 * @param {string} source the shrunk source that broke the invariants
 * @param {string} broke what broke, one finding per paragraph
 * @param {number} seed the seed the run took
 * @returns {string} a Markdown report showing the source and what broke
 */
const fuzzReport = (source, broke, seed) =>
	[
		`Seed ${seed} generated a source that breaks the invariants.`,
		"#### Source",
		codeBlock(source),
		"As a JSON string, every character visible:",
		codeBlock(JSON.stringify(source)),
		"#### What broke",
		codeBlock(broke)
	].join("\n\n");

/**
 * Joins random sequences of a syntax's pieces into sources and holds each to
 * the invariants its fixtures are held to; a failure shrinks to the shortest.
 * @param {SyntaxInvariants} syntax the syntax's answers
 * @param {readonly string[]} pieces what a source is joined from
 * @param {FuzzOptions=} options the known findings and source length
 * @returns {void}
 */
const fuzzSyntax = (syntax, pieces, options = {}) => {
	const { known = [], maxLength = 32 } = options;
	const seed = numberFrom(process.env.FUZZ_SEED, SEED);
	const details = fc.check(
		fc.property(
			fc
				.array(fc.constantFrom(...pieces), { maxLength })
				.map((parts) => parts.join("")),
			(source) => {
				const left = unexplainedFindings(
					source,
					invariantFindings(syntax, [["fuzz", source]]),
					known
				);
				if (left.length > 0) throw new FindingsError(left);
			}
		),
		{ seed, numRuns: numberFrom(process.env.FUZZ_RUNS, RUNS) }
	);
	if (!details.failed) return;
	const [source] = /** @type {[string]} */ (details.counterexample);
	const error = details.errorInstance;
	// A crash shows where it came from; a finding's repro is all there is to see.
	const broke =
		error instanceof FindingsError
			? error.message
			: String(error instanceof Error ? error.stack : error);
	const report = fuzzReport(source, broke, seed);
	// The Fuzz workflow files this as the issue body.
	if (process.env.FUZZ_REPORT) {
		fs.writeFileSync(process.env.FUZZ_REPORT, report);
	}
	throw new Error(report);
};

module.exports = { fuzzSyntax };
