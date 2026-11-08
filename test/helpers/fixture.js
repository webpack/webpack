"use strict";

const fs = require("fs");
const path = require("path");

const FIXTURES = path.join(__dirname, "..", "fixtures");

/** @typedef {"css" | "html" | "javascript" | "xml"} FixtureLanguage */

/** @type {Map<string, string>} */
const cache = new Map();

/**
 * @param {FixtureLanguage} lang a fixture language
 * @returns {string} the file name its inputs are kept under
 */
const indexFile = (lang) =>
	lang === "javascript" ? "index.js" : `index.${lang}`;

/**
 * One unit-test input, kept once under `test/fixtures/<lang>/<name>/`.
 * @param {FixtureLanguage} lang the language the input is written in
 * @param {string} name the fixture directory
 * @returns {string} the input
 */
const fixture = (lang, name) => {
	const file = path.join(FIXTURES, lang, name, indexFile(lang));
	let source = cache.get(file);
	if (source === undefined) {
		source = fs.readFileSync(file, "utf8");
		cache.set(file, source);
	}
	return source;
};

/**
 * A relation a fixture is allowed to break, with why it is owed nothing.
 * @typedef {object} KnownDifference
 * @property {string} relation the relation, as a finding names it
 * @property {string} contains text the finding's repro holds
 * @property {string} why the reason, read by whoever meets the entry later
 */

/** @typedef {{ mode: "minify" | "beautify", xml?: boolean }} PrintOptionSet */

/**
 * @typedef {object} FixtureEntry
 * @property {string} name the fixture directory
 * @property {string} source its input
 * @property {PrintOptionSet[]} options the option sets it is printed under, minifying with the defaults first
 * @property {PrintOptionSet[]} behavior those of them whose print runs against the source and must do what it does
 * @property {KnownDifference[]} expected what its `expected.json` lets it break
 */

/**
 * @param {string} file a JSON file
 * @returns {EXPECTED_ANY[]} its array, or none where the file is absent
 */
const readList = (file) =>
	fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];

/**
 * Every fixture of a language with what the runner asks of it. Its
 * `options.json` lists option sets to print it under as well; one marked
 * `"behavior": true` (marker left out of what the printer gets) also runs.
 * @param {FixtureLanguage} lang the language
 * @returns {FixtureEntry[]} one entry per fixture, by name
 */
const fixtures = (lang) => {
	/** @type {FixtureEntry[]} */
	const entries = [];
	const dir = path.join(FIXTURES, lang);
	// XML prints through the HTML printer, so its defaults name the dialect.
	/** @type {PrintOptionSet} */
	const first =
		lang === "xml" ? { xml: true, mode: "minify" } : { mode: "minify" };
	for (const name of fs.readdirSync(dir).sort()) {
		if (!fs.existsSync(path.join(dir, name, indexFile(lang)))) continue;
		/** @type {Map<string, PrintOptionSet>} */
		const options = new Map([[JSON.stringify(first), first]]);
		/** @type {Set<PrintOptionSet>} */
		const behavior = new Set();
		for (const { behavior: runs, ...one } of readList(
			path.join(dir, name, "options.json")
		)) {
			const key = JSON.stringify(one);
			if (!options.has(key)) options.set(key, one);
			if (runs === true) {
				behavior.add(/** @type {PrintOptionSet} */ (options.get(key)));
			}
		}
		entries.push({
			name,
			source: fixture(lang, name),
			options: [...options.values()],
			behavior: [...behavior],
			expected: readList(path.join(dir, name, "expected.json"))
		});
	}
	return entries;
};

/**
 * What a fixture's findings leave unexplained: each finding no entry names,
 * and each entry no finding needs any more, which has to go.
 * @param {{ preset: string, report: { relation: string, what: string, repro: string } }[]} findings what the relations reported
 * @param {KnownDifference[]} expected the fixture's known differences
 * @returns {string[]} one line per finding left over or entry gone stale
 */
const unexplained = (findings, expected) => {
	/** @type {Set<KnownDifference>} */
	const used = new Set();
	/** @type {string[]} */
	const left = [];
	for (const { preset, report } of findings) {
		const entry = expected.find(
			(one) =>
				one.relation === report.relation && report.repro.includes(one.contains)
		);
		if (entry === undefined) {
			left.push(
				`${report.relation} [${preset}] ${report.what}\n${report.repro}`
			);
		} else {
			used.add(entry);
		}
	}
	for (const entry of expected) {
		if (!used.has(entry)) {
			left.push(`stale: ${entry.relation} ${entry.contains}`);
		}
	}
	return left;
};

/**
 * A printed text as a snapshot holds it: raw where it reads as text, as a JSON
 * string where a control character would otherwise land in the snapshot file.
 * @param {string} text what was printed
 * @returns {string} the snapshot's value
 */
const snapshotText = (text) =>
	// eslint-disable-next-line no-control-regex
	/[\u0000-\u0008\u000B-\u001F\u007F]/.test(text) ? JSON.stringify(text) : text;

module.exports = { fixture, fixtures, snapshotText, unexplained };
