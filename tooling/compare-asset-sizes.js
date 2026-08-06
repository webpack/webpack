/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

// Diff two reports written by `tooling/collect-asset-sizes.js` and render the
// result as markdown for a pull request comment.
//
//   node tooling/compare-asset-sizes.js --base base.json --head head.json --out comment.md
//
// Paths resolve against the working directory, not against this file: CI copies
// the script out of the checkout to run it against a different commit.

const fs = require("fs");
const path = require("path");

/** @typedef {import("./collect-asset-sizes").AssetSizes} AssetSizes */
/** @typedef {import("./collect-asset-sizes").Report} Report */

/**
 * @typedef {object} Row
 * @property {string} case case the asset belongs to
 * @property {string} asset asset name
 * @property {AssetSizes} base sizes on the base branch
 * @property {AssetSizes} head sizes on this branch
 */

const MARKER = "<!-- webpack-asset-sizes -->";
const EMPTY = { size: 0, gzip: 0, brotli: 0, count: 0 };

/**
 * @param {string} commit full commit hash
 * @returns {string} abbreviated commit hash
 */
const shortCommit = (commit) => (commit ? commit.slice(0, 7) : "");

/**
 * @param {number} bytes byte count
 * @returns {string} human readable size
 */
const formatBytes = (bytes) => {
	if (Math.abs(bytes) < 1024) return `${bytes} B`;
	if (Math.abs(bytes) < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * @param {number} bytes signed byte delta
 * @returns {string} human readable delta
 */
const formatDelta = (bytes) =>
	`${bytes > 0 ? "+" : bytes < 0 ? "-" : ""}${formatBytes(Math.abs(bytes))}`;

/**
 * @param {number} base base value
 * @param {number} head head value
 * @returns {number} percentage change from base to head
 */
const percent = (base, head) => {
	if (base === head) return 0;
	if (base === 0) return 100;
	return ((head - base) / base) * 100;
};

/**
 * @param {number} base base value
 * @param {number} head head value
 * @param {number} threshold percentage below which a change is not called out
 * @returns {string} change cell with its indicator
 */
const formatChange = (base, head, threshold) => {
	const delta = head - base;
	const ratio = percent(base, head);
	const indicator =
		Math.abs(ratio) < threshold ? "⚫" : delta < 0 ? "🟢" : "🔴";
	return `${indicator} ${formatDelta(delta)} (${ratio > 0 ? "+" : ""}${ratio.toFixed(1)}%)`;
};

/**
 * @param {Record<string, AssetSizes>} totals accumulator keyed by nothing — mutated in place
 * @param {string} key which total to add to
 * @param {AssetSizes} sizes sizes to add
 * @returns {void}
 */
const addTo = (totals, key, sizes) => {
	const total = totals[key] || (totals[key] = { ...EMPTY });
	total.size += sizes.size;
	total.gzip += sizes.gzip;
	total.brotli += sizes.brotli;
	total.count += sizes.count;
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
/** @type {Report} */
const baseReport = JSON.parse(fs.readFileSync(path.resolve(args.base), "utf8"));
/** @type {Report} */
const headReport = JSON.parse(fs.readFileSync(path.resolve(args.head), "utf8"));
const limit = args.limit ? Number(args.limit) : 25;
const threshold = args.threshold ? Number(args.threshold) : 1;

/** @type {Row[]} */
const changed = [];
/** @type {Row[]} */
const added = [];
/** @type {Row[]} */
const removed = [];
/** @type {Record<string, AssetSizes>} */
const totals = {};
let comparedAssets = 0;

for (const name of new Set([
	...Object.keys(baseReport.cases),
	...Object.keys(headReport.cases)
]).values()) {
	const baseAssets = baseReport.cases[name] || {};
	const headAssets = headReport.cases[name] || {};
	for (const asset of new Set([
		...Object.keys(baseAssets),
		...Object.keys(headAssets)
	]).values()) {
		const base = baseAssets[asset];
		const head = headAssets[asset];
		if (!base) {
			added.push({ case: name, asset, base: EMPTY, head });
			addTo(totals, "added", head);
			continue;
		}
		if (!head) {
			removed.push({ case: name, asset, base, head: EMPTY });
			addTo(totals, "removed", base);
			continue;
		}
		comparedAssets++;
		addTo(totals, "base", base);
		addTo(totals, "head", head);
		if (base.size !== head.size || base.gzip !== head.gzip) {
			changed.push({ case: name, asset, base, head });
		}
	}
}

changed.sort(
	(a, b) =>
		Math.abs(b.head.gzip - b.base.gzip) - Math.abs(a.head.gzip - a.base.gzip) ||
		Math.abs(b.head.size - b.base.size) - Math.abs(a.head.size - a.base.size)
);

const smaller = changed.filter((row) => row.head.size < row.base.size).length;
const larger = changed.length - smaller;
const baseTotal = totals.base || { ...EMPTY };
const headTotal = totals.head || { ...EMPTY };

/** @type {string[]} */
const lines = [
	MARKER,
	"## Config case asset sizes",
	"",
	`Compared \`${shortCommit(headReport.commit) || "this branch"}\` against base \`${shortCommit(baseReport.commit) || "main"}\` over ${comparedAssets} assets emitted by ${Object.keys(headReport.cases).length} \`test/configCases\` cases.`,
	"",
	`**${smaller} smaller · ${larger} larger · ${comparedAssets - changed.length} unchanged${added.length > 0 ? ` · ${added.length} added` : ""}${removed.length > 0 ? ` · ${removed.length} removed` : ""}**`,
	""
];

if (changed.length === 0 && added.length === 0 && removed.length === 0) {
	lines.push("No emitted asset changed size.", "");
} else if (changed.length > 0) {
	lines.push(
		"| Case | Asset | Base | This PR | Change | Gzip |",
		"|---|---|---:|---:|---|---|"
	);
	for (const row of changed.slice(0, limit)) {
		lines.push(
			`| \`${row.case}\` | \`${row.asset}\` | ${formatBytes(row.base.size)} | ${formatBytes(row.head.size)} | ${formatChange(row.base.size, row.head.size, threshold)} | ${formatChange(row.base.gzip, row.head.gzip, threshold)} |`
		);
	}
	if (changed.length > limit) {
		lines.push(
			"",
			`<sub>… and ${changed.length - limit} more changed assets — the full list is in the job summary.</sub>`
		);
	}
	lines.push("");
}

/**
 * @param {string} title section title
 * @param {Row[]} rows rows to render
 * @param {"base" | "head"} side which side holds the sizes
 * @returns {void}
 */
const pushListSection = (title, rows, side) => {
	if (rows.length === 0) return;
	lines.push(`<details><summary>${title} (${rows.length})</summary>`, "");
	lines.push("| Case | Asset | Size | Gzip |", "|---|---|---:|---:|");
	for (const row of rows.slice(0, limit)) {
		lines.push(
			`| \`${row.case}\` | \`${row.asset}\` | ${formatBytes(row[side].size)} | ${formatBytes(row[side].gzip)} |`
		);
	}
	if (rows.length > limit) {
		lines.push("", `<sub>… and ${rows.length - limit} more.</sub>`);
	}
	lines.push("", "</details>", "");
};

pushListSection("Assets only in this PR", added, "head");
pushListSection("Assets only on the base branch", removed, "base");

lines.push(
	"| Total over all cases | Base | This PR | Change |",
	"|---|---:|---:|---|",
	`| Raw | ${formatBytes(baseTotal.size)} | ${formatBytes(headTotal.size)} | ${formatChange(baseTotal.size, headTotal.size, threshold)} |`,
	`| Gzip | ${formatBytes(baseTotal.gzip)} | ${formatBytes(headTotal.gzip)} | ${formatChange(baseTotal.gzip, headTotal.gzip, threshold)} |`,
	`| Brotli | ${formatBytes(baseTotal.brotli)} | ${formatBytes(headTotal.brotli)} | ${formatChange(baseTotal.brotli, headTotal.brotli, threshold)} |`,
	"",
	"<sub>Brotli is measured at quality 5 — a relative signal, not the size a quality 11 build ships.</sub>",
	""
);

if (args["run-url"]) {
	lines.push(`[View the full report](${args["run-url"]})`, "");
}

lines.push(
	`<sub>🟢 smaller · 🔴 larger · ⚫ change below ${threshold}% · assets with content hashes are matched by name shape · totals exclude added/removed assets</sub>`
);

// lets CI skip opening a comment on a pull request that changed nothing
if (args["out-status"]) {
	fs.writeFileSync(
		path.resolve(args["out-status"]),
		JSON.stringify({
			changed: changed.length,
			added: added.length,
			removed: removed.length
		}),
		"utf8"
	);
}

const markdown = `${lines.join("\n")}\n`;
if (args.out) {
	fs.writeFileSync(path.resolve(args.out), markdown, "utf8");
} else {
	console.log(markdown);
}
