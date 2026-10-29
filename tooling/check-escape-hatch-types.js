/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Holds each file's `EXPECTED_ANY`, `EXPECTED_OBJECT` and `EXPECTED_FUNCTION`
// count to `escape-hatch-types.json`: a count may not grow, and one that drops
// fails too until `--write` locks the lower number in.
//
//   node tooling/check-escape-hatch-types.js          # check
//   node tooling/check-escape-hatch-types.js --write  # rewrite the baseline

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BASELINE = path.join(__dirname, "escape-hatch-types.json");
const DIRECTORIES = ["lib", "hot"];
const NAMES = ["EXPECTED_ANY", "EXPECTED_OBJECT", "EXPECTED_FUNCTION"];
const ESCAPE_HATCH_REGEXP = /\bEXPECTED_(?:ANY|OBJECT|FUNCTION)\b/g;

/** @typedef {Record<string, number>} Counts */

/**
 * Returns the `.js` files under a directory, by path relative to the repository.
 * @param {string} directory the directory, relative to the repository
 * @returns {string[]} its files, sorted
 */
const filesIn = (directory) => {
	/** @type {string[]} */
	const files = [];
	/**
	 * @param {string} relative a directory relative to the repository
	 */
	const walk = (relative) => {
		for (const entry of fs.readdirSync(path.join(ROOT, relative), {
			withFileTypes: true
		})) {
			const child = `${relative}/${entry.name}`;
			if (entry.isDirectory()) walk(child);
			else if (entry.name.endsWith(".js")) files.push(child);
		}
	};
	walk(directory);
	return files.sort();
};

/**
 * Counts the escape hatches of every file that has any.
 * @returns {Record<string, Counts>} counts by file, then by name
 */
const countAll = () => {
	/** @type {Record<string, Counts>} */
	const result = {};
	for (const directory of DIRECTORIES) {
		for (const file of filesIn(directory)) {
			const source = fs.readFileSync(path.join(ROOT, file), "utf8");
			/** @type {Counts} */
			const counts = {};
			ESCAPE_HATCH_REGEXP.lastIndex = 0;
			let match;
			while ((match = ESCAPE_HATCH_REGEXP.exec(source)) !== null) {
				counts[match[0]] = (counts[match[0]] || 0) + 1;
			}
			if (Object.keys(counts).length > 0) result[file] = counts;
		}
	}
	return result;
};

/**
 * Compares the counts with the baseline, or rewrites the baseline with them.
 * @returns {boolean} whether the counts match the baseline
 */
const check = () => {
	const current = countAll();
	if (process.argv.includes("--write")) {
		fs.writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
		console.log(`Wrote ${path.relative(ROOT, BASELINE)}`);
		return true;
	}
	/** @type {Record<string, Counts>} */
	const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
	/** @type {string[]} */
	const grown = [];
	/** @type {string[]} */
	const dropped = [];
	for (const file of new Set([
		...Object.keys(baseline),
		...Object.keys(current)
	])) {
		for (const name of NAMES) {
			const before = (baseline[file] && baseline[file][name]) || 0;
			const after = (current[file] && current[file][name]) || 0;
			if (after > before) {
				grown.push(`${file}: ${name} ${before} → ${after}`);
			} else if (after < before) {
				dropped.push(`${file}: ${name} ${before} → ${after}`);
			}
		}
	}
	if (grown.length > 0) {
		console.error(
			`Escape-hatch types grew; use a real type instead (AGENTS.md, Type annotations):\n  ${grown.join("\n  ")}`
		);
	}
	if (dropped.length > 0) {
		console.error(
			`Escape-hatch types dropped; run \`node tooling/check-escape-hatch-types.js --write\` to lock it in:\n  ${dropped.join("\n  ")}`
		);
	}
	if (grown.length > 0 || dropped.length > 0) return false;
	/** @type {Counts} */
	const totals = {};
	for (const counts of Object.values(current)) {
		for (const name of NAMES) {
			totals[name] = (totals[name] || 0) + (counts[name] || 0);
		}
	}
	console.log(
		`Escape-hatch types within budget: ${NAMES.map((name) => `${name} ${totals[name]}`).join(", ")}`
	);
	return true;
};

if (!check()) process.exitCode = 1;
