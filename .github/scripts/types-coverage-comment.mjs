/* eslint-disable no-console */

import fs from "fs";

// Keeps the section small enough that every producer fits in the shared comment.
const MAX_LISTED_FILES = 50;

/**
 * @typedef {object} FileCoverage
 * @property {string} path repository relative path
 * @property {number} found number of statements
 * @property {number} hit number of precisely typed statements
 */

/**
 * @param {string} lcov contents of an lcov report
 * @returns {FileCoverage[]} coverage per file
 */
function parseLcov(lcov) {
	/** @type {FileCoverage[]} */
	const files = [];
	/** @type {FileCoverage | undefined} */
	let current;

	for (const line of lcov.split(/\r?\n/)) {
		if (line.startsWith("SF:")) {
			current = { path: line.slice(3), found: 0, hit: 0 };
		} else if (!current) {
			continue;
		} else if (line.startsWith("LF:")) {
			current.found = Number(line.slice(3));
		} else if (line.startsWith("LH:")) {
			current.hit = Number(line.slice(3));
		} else if (line === "end_of_record") {
			files.push(current);
			current = undefined;
		}
	}

	return files;
}

/**
 * @param {number} hit number of precisely typed statements
 * @param {number} found number of statements
 * @returns {string} percentage with two decimals
 */
function percentage(hit, found) {
	return found === 0 ? "100.00%" : `${((hit / found) * 100).toFixed(2)}%`;
}

const lcovPath = process.env.LCOV_PATH || "coverage/lcov.info";
const outputPath = process.env.OUTPUT_PATH;

if (!outputPath) {
	throw new Error("OUTPUT_PATH must be provided");
}

const files = parseLcov(fs.readFileSync(lcovPath, "utf8"));
const found = files.reduce((total, file) => total + file.found, 0);
const hit = files.reduce((total, file) => total + file.hit, 0);
const untyped = files
	.filter((file) => file.hit < file.found)
	.sort((a, b) => b.found - b.hit - (a.found - a.hit));

const lines = [
	"#### 🧩 Types coverage",
	"",
	`**${percentage(hit, found)}** of \`${found.toLocaleString("en-US")}\` statements are precisely typed.`
];

if (untyped.length > 0) {
	const repository = process.env.GITHUB_REPOSITORY;
	const sha = process.env.COMMIT_SHA || process.env.GITHUB_SHA;
	const listed = untyped.slice(0, MAX_LISTED_FILES);

	lines.push(
		"",
		"<details>",
		`<summary>${untyped.length} files with untyped statements</summary>`,
		"",
		"| File | Coverage | Untyped |",
		"| :--- | ---: | ---: |",
		...listed.map((file) => {
			const name =
				repository && sha
					? `[${file.path}](https://github.com/${repository}/blob/${sha}/${file.path})`
					: file.path;

			return `| ${name} | ${percentage(file.hit, file.found)} | ${file.found - file.hit} |`;
		})
	);

	if (untyped.length > listed.length) {
		lines.push("", `_… and ${untyped.length - listed.length} more files._`);
	}

	lines.push("", "</details>");
}

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log(
	`Types coverage: ${percentage(hit, found)} (${found - hit} untyped of ${found}) across ${files.length} files.`
);
