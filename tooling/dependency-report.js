/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Lists every package a user gets from `npm install webpack webpack-cli
// webpack-dev-server`, with this checkout standing in for `webpack`. Only
// production dependencies: npm never installs a dependency's devDependencies.

const cp = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PACKAGES = ["webpack-cli", "webpack-dev-server"];
// Shown as the parent of the packages the user asked for.
const DIRECT = "(direct)";

/**
 * @typedef {object} LockEntry
 * @property {string=} name
 * @property {string=} version
 * @property {Record<string, string>=} dependencies
 * @property {Record<string, string>=} optionalDependencies
 * @property {Record<string, string>=} peerDependencies
 */

/**
 * @typedef {object} ReportRow
 * @property {string} name
 * @property {string} version
 * @property {number} copies how many times npm installed this version
 * @property {number} size bytes on disk of all copies, nested `node_modules` excluded
 * @property {string[]} parents `name@version` of the packages depending on it
 */

/**
 * Runs a command, failing loudly when it does.
 * @param {string} command executable
 * @param {string[]} args arguments
 * @param {string} cwd working directory
 * @returns {string} stdout
 */
const run = (command, args, cwd) =>
	cp.execFileSync(command, args, {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "inherit"]
	});

/**
 * Sums the size of the files of one installed package.
 * @param {string} dir package directory
 * @returns {number} bytes, nested `node_modules` excluded
 */
const packageSize = (dir) => {
	let size = 0;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules") continue;
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) size += packageSize(file);
		else if (entry.isFile()) size += fs.statSync(file).size;
	}
	return size;
};

/**
 * Finds where Node would resolve `name` from a lockfile location.
 * @param {Record<string, LockEntry>} packages lockfile `packages`
 * @param {string} from location of the requiring package, `""` for the root
 * @param {string} name dependency name
 * @returns {string | undefined} location of the resolved package
 */
const resolveLocation = (packages, from, name) => {
	let location = from;
	for (;;) {
		const candidate = `${location ? `${location}/` : ""}node_modules/${name}`;
		if (packages[candidate]) return candidate;
		if (location === "") return;
		const index = location.lastIndexOf("node_modules/");
		location = index === 0 ? "" : location.slice(0, index - 1);
	}
};

/**
 * Builds one row per installed package from an npm lockfile.
 * @param {string} dir install directory holding `package-lock.json`
 * @returns {ReportRow[]} one row per name and version, sorted by both
 */
const collect = (dir) => {
	/** @type {Record<string, LockEntry>} */
	const packages = JSON.parse(
		fs.readFileSync(path.join(dir, "package-lock.json"), "utf8")
	).packages;
	// Copies of one version npm could not hoist share a row.
	/** @type {Map<string, ReportRow>} */
	const rows = new Map();
	/** @type {Map<string, ReportRow>} */
	const rowsByLocation = new Map();
	for (const location of Object.keys(packages)) {
		// An optional dependency for another platform is locked but not installed.
		if (location === "" || !fs.existsSync(path.join(dir, location))) continue;
		const entry = packages[location];
		const name =
			entry.name || location.slice(location.lastIndexOf("node_modules/") + 13);
		const version = entry.version || "";
		const key = `${name}@${version}`;
		let row = rows.get(key);
		if (!row) {
			row = { name, version, copies: 0, size: 0, parents: [] };
			rows.set(key, row);
		}
		row.copies++;
		row.size += packageSize(path.join(dir, location));
		rowsByLocation.set(location, row);
	}
	for (const location of Object.keys(packages)) {
		const parent = location === "" ? undefined : rowsByLocation.get(location);
		if (location !== "" && !parent) continue;
		const entry = packages[location];
		const names = new Set([
			...Object.keys(entry.dependencies || {}),
			...Object.keys(entry.optionalDependencies || {}),
			...Object.keys(entry.peerDependencies || {})
		]);
		for (const name of names) {
			const resolved = resolveLocation(packages, location, name);
			const row = resolved && rowsByLocation.get(resolved);
			if (!row) continue;
			const parentName = parent ? `${parent.name}@${parent.version}` : DIRECT;
			if (!row.parents.includes(parentName)) row.parents.push(parentName);
		}
	}
	return [...rows.values()]
		.map((row) => ({ ...row, parents: row.parents.sort() }))
		.sort(
			(a, b) =>
				a.name.localeCompare(b.name) || a.version.localeCompare(b.version)
		);
};

/**
 * Formats a byte count for people.
 * @param {number} bytes size
 * @returns {string} e.g. `12.3 KiB`
 */
const formatSize = (bytes) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
};

/**
 * Renders the rows as a Markdown report.
 * @param {ReportRow[]} rows report rows
 * @param {Record<string, string>} installed versions of the requested packages
 * @returns {string} Markdown
 */
const toMarkdown = (rows, installed) => {
	const total = rows.reduce((sum, row) => sum + row.size, 0);
	const copies = rows.reduce((sum, row) => sum + row.copies, 0);
	const requested = Object.keys(installed)
		.map((name) => `\`${name}@${installed[name]}\``)
		.join(", ");
	/** @type {Map<string, ReportRow[]>} */
	const versions = new Map();
	for (const row of rows) {
		const list = versions.get(row.name);
		if (list) list.push(row);
		else versions.set(row.name, [row]);
	}
	const duplicated = [...versions.values()].filter(
		(list) => list.length > 1 || list[0].copies > 1
	);
	return [
		"## Installed dependencies",
		"",
		`Installing ${requested} pulls in **${versions.size}** packages (${
			rows.length
		} versions, ${copies} copies on disk), **${formatSize(
			total
		)}** in total (dependencies only, no devDependencies).`,
		"",
		"| Name | Version | Copies | Size | Parent packages |",
		"| ---- | ------- | -----: | ---: | --------------- |",
		...rows.map(
			(row) =>
				`| ${row.name} | ${row.version} | ${row.copies} | ${formatSize(
					row.size
				)} | ${row.parents.join(", ")} |`
		),
		"",
		"## Duplicated packages",
		"",
		`${duplicated.length} packages are installed more than once: in several versions, or one version npm could not hoist.`,
		"",
		"| Name | Versions | Size | Parent packages per version |",
		"| ---- | -------- | ---: | --------------------------- |",
		...duplicated.map(
			(list) =>
				`| ${list[0].name} | ${list
					.map((row) => `${row.version} (×${row.copies})`)
					.join(", ")} | ${formatSize(
					list.reduce((sum, row) => sum + row.size, 0)
				)} | ${list
					.map((row) => `${row.version}: ${row.parents.join(", ")}`)
					.join("<br>")} |`
		),
		""
	].join("\n");
};

/**
 * Reads the value of a `--name <value>` flag.
 * @param {string} name flag name without the dashes
 * @returns {string | undefined} the value, if the flag was passed
 */
const readFlag = (name) => {
	const index = process.argv.indexOf(`--${name}`);
	return index === -1 ? undefined : process.argv[index + 1];
};

const values = { output: readFlag("output"), json: readFlag("json") };

const dir = fs.mkdtempSync(
	path.join(os.tmpdir(), "webpack-dependency-report-")
);
try {
	// `--ignore-scripts` keeps `prepare` (husky) from running on the checkout.
	const [{ filename }] = JSON.parse(
		run(
			"npm",
			["pack", "--json", "--ignore-scripts", "--pack-destination", dir],
			ROOT
		)
	);
	/** @type {Record<string, string>} */
	const dependencies = { webpack: `file:./${filename}` };
	for (const name of PACKAGES) dependencies[name] = "latest";
	fs.writeFileSync(
		path.join(dir, "package.json"),
		JSON.stringify({ private: true, dependencies })
	);
	run(
		process.execPath,
		[
			path.join(__dirname, "retry.js"),
			"npm",
			"install",
			"--omit=dev",
			"--ignore-scripts",
			"--no-audit",
			"--no-fund"
		],
		dir
	);
	const rows = collect(dir);
	/** @type {Record<string, string>} */
	const installed = {};
	for (const name of ["webpack", ...PACKAGES]) {
		const row = rows.find(
			(row) => row.name === name && row.parents.includes(DIRECT)
		);
		installed[name] = row ? row.version : "?";
	}
	const markdown = toMarkdown(rows, installed);
	if (values.output) fs.writeFileSync(values.output, markdown);
	else process.stdout.write(markdown);
	if (values.json) {
		fs.writeFileSync(values.json, `${JSON.stringify(rows, null, 2)}\n`);
	}
} finally {
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	fs.rmSync(dir, { recursive: true, force: true });
}
