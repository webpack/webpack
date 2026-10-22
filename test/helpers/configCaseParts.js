"use strict";

const fs = require("fs");
const path = require("path");

const casesPath = path.join(__dirname, "../configCases");

// How many files each suite over `configCases` is split into, so Jest runs
// the parts of one long suite on separate workers.
const PART_COUNTS = {
	ConfigTestCases: 2,
	ConfigCacheTestCases: 3
};

/** @type {Map<number, Map<string, number>> | undefined} */
let partsByCount;

/**
 * Deals the categories into `count` parts holding about as many cases each,
 * largest category first.
 * @param {number} count how many parts
 * @returns {Map<string, number>} each category's part, from 1
 */
const partsOf = (count) => {
	if (partsByCount === undefined) partsByCount = new Map();
	let parts = partsByCount.get(count);
	if (parts !== undefined) return parts;
	parts = new Map();
	const sizes = Array.from({ length: count }, () => 0);
	const categories = fs.readdirSync(casesPath).map((name) => ({
		name,
		size: fs
			.readdirSync(path.join(casesPath, name))
			.filter((folder) => !folder.startsWith("_")).length
	}));
	categories.sort((a, b) => b.size - a.size || (a.name < b.name ? -1 : 1));
	for (const { name, size } of categories) {
		const smallest = sizes.indexOf(Math.min(...sizes));
		sizes[smallest] += size;
		parts.set(name, smallest + 1);
	}
	partsByCount.set(count, parts);
	return parts;
};

/**
 * @param {keyof typeof PART_COUNTS} suite the suite
 * @param {string} category a category under `configCases`
 * @returns {number} the part, from 1, whose file runs that category
 */
const partOf = (suite, category) =>
	/** @type {number} */ (partsOf(PART_COUNTS[suite]).get(category));

/**
 * @param {keyof typeof PART_COUNTS} suite the suite
 * @param {string} category a category under `configCases`
 * @returns {string} the test file that runs that category
 */
const partFileOf = (suite, category) =>
	path.join(
		__dirname,
		"..",
		`${suite}.part${partOf(suite, category)}.basictest.js`
	);

module.exports = { PART_COUNTS, partFileOf, partOf };
