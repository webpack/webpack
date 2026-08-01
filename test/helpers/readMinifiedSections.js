"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Read a minified CSS asset and split it into one entry per `/*!` label. The
 * corpus fixtures put a kept comment before every case, so a snapshot shows —
 * and diffs — one case per line instead of one very long line.
 * @param {string} outputPath the compilation's output directory
 * @param {string} name the asset's filename
 * @returns {string[]} the labelled sections, in source order
 */
const readMinifiedSections = (outputPath, name) =>
	fs
		.readFileSync(path.join(outputPath, name), "utf8")
		.split(/(?=\/\*! )/u)
		.filter((section) => section.length !== 0);

module.exports = readMinifiedSections;
