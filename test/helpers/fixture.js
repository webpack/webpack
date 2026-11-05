"use strict";

const fs = require("fs");
const path = require("path");

const FIXTURES = path.join(__dirname, "..", "fixtures");

/** @type {Map<string, string>} */
const cache = new Map();

/**
 * One unit-test input, kept once under `test/fixtures/<lang>/<name>/index.<lang>`.
 * @param {"css" | "html"} lang the language the input is written in
 * @param {string} name the fixture directory
 * @returns {string} the input
 */
const fixture = (lang, name) => {
	const file = path.join(FIXTURES, lang, name, `index.${lang}`);
	let source = cache.get(file);
	if (source === undefined) {
		source = fs.readFileSync(file, "utf8");
		cache.set(file, source);
	}
	return source;
};

/**
 * @typedef {object} FixtureCase
 * @property {string} name the fixture directory
 * @property {string} source its input
 * @property {{ mode: "minify" | "beautify" }} options one option set the printer is asked under, the rest of it read by the language's printer
 */

/**
 * Every fixture of a language paired with each option set its `options.json`
 * names, the unit tests' inputs whose printed output is a snapshot.
 * @param {"css" | "html"} lang the language
 * @returns {FixtureCase[]} one case per fixture and option set
 */
const fixtureCases = (lang) => {
	/** @type {FixtureCase[]} */
	const cases = [];
	const dir = path.join(FIXTURES, lang);
	for (const name of fs.readdirSync(dir).sort()) {
		const file = path.join(dir, name, "options.json");
		if (!fs.existsSync(file)) continue;
		const source = fixture(lang, name);
		for (const options of JSON.parse(fs.readFileSync(file, "utf8"))) {
			cases.push({ name, source, options });
		}
	}
	return cases;
};

module.exports = { fixture, fixtureCases };
