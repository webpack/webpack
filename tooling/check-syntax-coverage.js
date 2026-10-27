/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Holds each language's syntax to the unit tests written for it: what its own
// tokenizer, parser and printer tests, and its minifier's, never run may not
// grow past `syntax-coverage.json`. Each language runs in a jest process of its
// own, as tests sharing a worker would lend one another what they ran.
//
//   node tooling/check-syntax-coverage.js [language…]          # check
//   node tooling/check-syntax-coverage.js [language…] --write  # rewrite the baseline
//   node tooling/check-syntax-coverage.js [language…] --list   # print what never runs

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BASELINE = path.join(__dirname, "syntax-coverage.json");

/**
 * @param {string} dir the test directory
 * @param {string[]} names its test files' names
 * @returns {string[]} their paths
 */
const testsIn = (dir, names) =>
	names.map((name) => `test/unitCases/${dir}/${name}.unittest.js`);

/** @type {Record<string, { tests: string[], files: string[] }>} */
const LANGUAGES = {
	css: {
		tests: testsIn("css", ["tokenizer", "parser", "printer"]),
		files: [
			"lib/css/syntax-parser.js",
			"lib/css/syntax-printer.js",
			"lib/css/cssMinify.js"
		]
	},
	// XML is the HTML tokenizer, parser and printer in XML mode.
	html: {
		tests: [
			...testsIn("html", ["tokenizer", "parser", "printer"]),
			...testsIn("xml", ["tokenizer", "parser", "printer"])
		],
		files: [
			"lib/html/syntax-parser.js",
			"lib/html/syntax-printer.js",
			"lib/html/htmlMinify.js",
			"lib/html/xmlMinify.js"
		]
	},
	javascript: {
		tests: [
			...testsIn("javascript", [
				"tokenizer",
				"parser",
				"printer",
				"scope",
				"no-acorn"
			]),
			// The scan `FileSystemInfo` reads a CommonJS module's requests with.
			"test/unitCases/collectCjsRequireSpecifiers.unittest.js"
		],
		files: [
			"lib/javascript/syntax-parser.js",
			"lib/javascript/syntax-printer.js",
			"lib/javascript/ScopeAnalyzer.js",
			"lib/javascript/jsMinify.js"
		]
	},
	json: {
		tests: testsIn("json", ["printer"]),
		files: ["lib/json/jsonMinify.js"]
	}
};

/** @typedef {{ statements: number, branches: number, functions: number }} Uncovered */
/** @typedef {{ start: { line: number, column: number }, end: { line: number, column: number } }} Location */

const args = process.argv.slice(2);
const write = args.includes("--write");
const list = args.includes("--list");
const asked = args.filter((arg) => !arg.startsWith("--"));

/**
 * @param {string} language the language
 * @param {string[]} tests the language's tests
 * @param {string[]} files the files they are held to
 * @returns {Record<string, Uncovered>} what each file has its tests never run
 */
const measure = (language, tests, files) => {
	// Ignored by git, and written over by the next run.
	const out = path.join(ROOT, "coverage", `syntax-${language}`);
	execFileSync(
		process.execPath,
		[
			"--expose-gc",
			"--max-old-space-size=8192",
			"--experimental-vm-modules",
			"node_modules/jest-cli/bin/jest",
			"--ci",
			"--coverage",
			"--coverageReporters=json",
			`--coverageDirectory=${out}`,
			// The minifiers stay out of coverage where a worker runs them as
			// source; these tests call them in place.
			"--coveragePathIgnorePatterns=/node_modules/",
			...files.map((file) => `--collectCoverageFrom=${file}`),
			"--",
			...tests
		],
		{ cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] }
	);
	/** @type {Record<string, { s: Record<string, number>, f: Record<string, number>, b: Record<string, number[]>, statementMap: Record<string, Location>, fnMap: Record<string, { name: string, loc: Location }>, branchMap: Record<string, { type: string, loc: Location, locations: Location[] }> }>} */
	const coverage = JSON.parse(
		fs.readFileSync(path.join(out, "coverage-final.json"), "utf8")
	);
	/** @type {Record<string, Uncovered>} */
	const result = {};
	for (const file of files) {
		const hits = coverage[path.join(ROOT, file)];
		if (!hits) throw new Error(`${file}: no test of its language loads it`);
		if (list) {
			for (const [id, loc] of Object.entries(hits.statementMap)) {
				if (hits.s[id] === 0) {
					console.log(`${file}:${loc.start.line}\tstatement`);
				}
			}
			for (const [id, branch] of Object.entries(hits.branchMap)) {
				for (const [i, count] of hits.b[id].entries()) {
					const loc = branch.locations[i] || branch.loc;
					if (count === 0) {
						console.log(
							`${file}:${loc.start.line || branch.loc.start.line}\t${branch.type} branch ${i}`
						);
					}
				}
			}
			for (const [id, fn] of Object.entries(hits.fnMap)) {
				if (hits.f[id] === 0) {
					console.log(`${file}:${fn.loc.start.line}\tfunction ${fn.name}`);
				}
			}
		}
		result[file] = {
			statements: Object.values(hits.s).filter((n) => n === 0).length,
			branches: Object.values(hits.b)
				.flat()
				.filter((n) => n === 0).length,
			functions: Object.values(hits.f).filter((n) => n === 0).length
		};
	}
	return result;
};

for (const language of asked) {
	if (!LANGUAGES[language]) throw new Error(`Unknown language ${language}`);
}

/** @type {Record<string, Record<string, Uncovered>>} */
const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
/** @type {string[]} */
const grown = [];
/** @type {string[]} */
const shrunk = [];
for (const [language, { tests, files }] of Object.entries(LANGUAGES)) {
	if (asked.length > 0 && !asked.includes(language)) continue;
	const measured = measure(language, tests, files);
	for (const file of files) {
		const allowed = (baseline[language] || {})[file] || {
			statements: 0,
			branches: 0,
			functions: 0
		};
		for (const kind of /** @type {(keyof Uncovered)[]} */ ([
			"statements",
			"branches",
			"functions"
		])) {
			const line = `${file}: ${measured[file][kind]} ${kind} its own tests never run, ${allowed[kind]} allowed`;
			if (measured[file][kind] > allowed[kind]) grown.push(line);
			else if (measured[file][kind] < allowed[kind]) shrunk.push(line);
		}
	}
	console.log(`${language}: ${JSON.stringify(measured)}`);
	baseline[language] = measured;
}

if (write) {
	fs.writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);
} else {
	if (shrunk.length > 0) {
		console.log(
			`Coverage grew; lower the baseline with --write:\n  ${shrunk.join("\n  ")}`
		);
	}
	if (grown.length > 0) {
		console.error(
			`Syntax code its own unit tests never run grew; cover it from the language's tokenizer, parser, printer or minifier test:\n  ${grown.join("\n  ")}`
		);
		process.exitCode = 1;
	}
}
