/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

// Record the size of every asset the config cases emitted, so two builds (base
// and PR) can be diffed by `tooling/compare-asset-sizes.js`. Reads what the
// suite left in `test/js` — run the suite first:
//
//   yarn test:base --testPathPatterns=ConfigTestCases.basictest --ci
//   node tooling/collect-asset-sizes.js --out sizes.json
//
// Paths resolve against the working directory, not against this file: CI copies
// the script out of the checkout to run it against a different commit.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/**
 * @typedef {object} AssetSizes
 * @property {number} size raw byte size
 * @property {number} gzip gzipped byte size
 * @property {number} brotli brotli-compressed byte size
 * @property {number} count assets folded into this entry
 */

/**
 * @typedef {object} Report
 * @property {string} suite test suite the assets came from
 * @property {string} commit commit the assets were built from
 * @property {Record<string, Record<string, AssetSizes>>} cases sizes per `<category>/<case>`, keyed by asset name
 */

// written by the harness next to the assets, not part of the compilation output
const HARNESS_FILES = new Set(["stats.txt", "stats.json"]);
// content hashes move on any change; match assets by shape instead of by name
const HASH_REGEXP = /[\da-f]{8,}/gi;
// The numbers are only ever read as a base/head difference, so the quality that
// ships (11) buys nothing here — it costs ~50s per run against ~0.4s for 5.
const BROTLI_QUALITY = 5;

/**
 * @param {string} dir directory to walk
 * @param {string} prefix path prefix of `dir` relative to the walk root
 * @param {string[]} result collected relative paths
 * @returns {string[]} collected relative paths
 */
const walk = (dir, prefix, result) => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			walk(path.join(dir, entry.name), relative, result);
		} else if (entry.isFile() && !HARNESS_FILES.has(entry.name)) {
			result.push(relative);
		}
	}
	return result;
};

/**
 * @param {string} dir directory to list
 * @returns {string[]} sorted names of the contained directories
 */
const readDirectories = (dir) =>
	fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();

/**
 * @param {string} casesDir directory holding `<category>/<case>` output
 * @returns {Record<string, Record<string, AssetSizes>>} sizes per case
 */
const collect = (casesDir) => {
	/** @type {Record<string, Record<string, AssetSizes>>} */
	const cases = {};
	for (const category of readDirectories(casesDir)) {
		for (const name of readDirectories(path.join(casesDir, category))) {
			const caseDir = path.join(casesDir, category, name);
			/** @type {Record<string, AssetSizes>} */
			const assets = {};
			for (const file of walk(caseDir, "", [])) {
				const content = fs.readFileSync(path.join(caseDir, file));
				const key = file.replace(HASH_REGEXP, "[hash]");
				const sizes =
					assets[key] ||
					(assets[key] = { size: 0, gzip: 0, brotli: 0, count: 0 });
				sizes.size += content.length;
				sizes.gzip += zlib.gzipSync(content, { level: 9 }).length;
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				sizes.brotli += zlib.brotliCompressSync(content, {
					params: {
						[zlib.constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY,
						[zlib.constants.BROTLI_PARAM_SIZE_HINT]: content.length
					}
				}).length;
				sizes.count++;
			}
			if (Object.keys(assets).length > 0) cases[`${category}/${name}`] = assets;
		}
	}
	return cases;
};

/**
 * @param {string[]} argv command line arguments
 * @returns {Record<string, string>} parsed `--key value` pairs
 */
const parseArgs = (argv) => {
	/** @type {Record<string, string>} */
	const args = {};
	for (let i = 0; i < argv.length; i += 2) {
		const key = argv[i];
		if (!key.startsWith("--")) throw new Error(`Unexpected argument ${key}`);
		args[key.slice(2)] = argv[i + 1];
	}
	return args;
};

const args = parseArgs(process.argv.slice(2));
const suite = args.suite || "ConfigTestCases";
const casesDir = path.resolve(args.dir || path.join("test", "js", suite));
const out = path.resolve(args.out || "asset-sizes.json");

if (!fs.existsSync(casesDir)) {
	throw new Error(
		`${casesDir} does not exist — run the ${suite} suite before collecting sizes`
	);
}

const cases = collect(casesDir);
/** @type {Report} */
const report = { suite, commit: args.commit || "", cases };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report), "utf8");

const assetCount = Object.values(cases).reduce(
	(total, assets) => total + Object.keys(assets).length,
	0
);
console.log(
	`Collected ${assetCount} assets from ${Object.keys(cases).length} ${suite} cases into ${out}`
);
