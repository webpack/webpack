/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
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
// What a user installs, left out of the report itself: `webpack` as this
// checkout, every other package the latest release.
const PACKAGES = ["webpack", "webpack-cli", "webpack-dev-server"];
// Opens the pull request comment, so a later run updates it in place.
const COMMENT_MARKER = "<!-- dependency-report -->";
// GitHub rejects a comment body longer than this many characters.
const MAX_COMMENT_LENGTH = 65536;
// Shown as the parent of the packages the user asked for.
const DIRECT = "(direct)";

/**
 * @typedef {object} LockEntry
 * @property {string=} name
 * @property {string=} version
 * @property {Record<string, string>=} dependencies
 * @property {Record<string, string>=} optionalDependencies
 * @property {Record<string, string>=} peerDependencies
 * @property {boolean=} link whether the location links to another one
 * @property {string=} resolved the location a link points to
 */

/**
 * @typedef {object} ReportRow
 * @property {string} name
 * @property {string} version
 * @property {number} copies how many times npm installed this version
 * @property {number} size bytes on disk of all copies, nested `node_modules` excluded
 * @property {string[]} parents `name@version (range)` of each package depending on it
 * @property {string[]} path shortest `name@version` chain from a requested package to it
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
	// npm 11 links a `file:` dependency despite `--install-links`, leaving the
	// link without a version: its target and all nested under it move to it.
	for (const location of Object.keys(packages)) {
		const entry = packages[location];
		// A target already folded into its link is gone.
		if (!entry || !entry.link || !entry.resolved) continue;
		const { resolved } = entry;
		if (!packages[resolved]) continue;
		for (const nested of Object.keys(packages)) {
			if (nested !== resolved && !nested.startsWith(`${resolved}/`)) continue;
			packages[location + nested.slice(resolved.length)] = packages[nested];
			delete packages[nested];
		}
	}
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
			row = { name, version, copies: 0, size: 0, parents: [], path: [] };
			rows.set(key, row);
		}
		row.copies++;
		row.size += packageSize(path.join(dir, location));
		rowsByLocation.set(location, row);
	}
	// The graph stays per location, as two copies of one version can resolve
	// a dependency to different copies; only the rows merge them.
	/** @type {string[]} */
	const requested = [];
	/** @type {Map<string, Set<string>>} */
	const children = new Map();
	for (const location of Object.keys(packages)) {
		const parent = location === "" ? undefined : rowsByLocation.get(location);
		if (location !== "" && !parent) continue;
		const entry = packages[location];
		/** @type {Map<string, string>} */
		const ranges = new Map();
		for (const [name, range] of Object.entries(entry.dependencies || {})) {
			ranges.set(name, range);
		}
		for (const [name, range] of Object.entries(
			entry.optionalDependencies || {}
		)) {
			if (!ranges.has(name)) ranges.set(name, `optional ${range}`);
		}
		for (const [name, range] of Object.entries(entry.peerDependencies || {})) {
			if (!ranges.has(name)) ranges.set(name, `peer ${range}`);
		}
		for (const [name, range] of ranges) {
			const resolved = resolveLocation(packages, location, name);
			const row = resolved && rowsByLocation.get(resolved);
			if (!resolved || !row) continue;
			if (!parent) {
				if (!requested.includes(resolved)) requested.push(resolved);
				if (!row.parents.includes(DIRECT)) row.parents.push(DIRECT);
				continue;
			}
			const label = `${parent.name}@${parent.version} (${range})`;
			if (!row.parents.includes(label)) row.parents.push(label);
			const set = children.get(location);
			if (set) set.add(resolved);
			else children.set(location, new Set([resolved]));
		}
	}
	// Breadth-first from the requested packages: the first copy of a row
	// reached gives it a shortest path.
	/** @type {Map<string, string | undefined>} */
	const via = new Map(requested.map((location) => [location, undefined]));
	const queue = [...requested];
	for (let index = 0; index < queue.length; index++) {
		const row = /** @type {ReportRow} */ (rowsByLocation.get(queue[index]));
		if (row.path.length === 0) {
			/** @type {string | undefined} */
			let step = queue[index];
			while (step) {
				const stepRow = /** @type {ReportRow} */ (rowsByLocation.get(step));
				row.path.unshift(`${stepRow.name}@${stepRow.version}`);
				step = via.get(step);
			}
		}
		for (const child of children.get(queue[index]) || []) {
			if (via.has(child)) continue;
			via.set(child, queue[index]);
			queue.push(child);
		}
	}
	for (const row of rows.values()) {
		if (row.path.length === 0) row.path.push(`${row.name}@${row.version}`);
	}
	return [...rows.values()]
		.map((row) => ({ ...row, parents: row.parents.sort() }))
		.sort(
			(a, b) =>
				a.name.localeCompare(b.name) ||
				a.version.localeCompare(b.version, undefined, { numeric: true })
		);
};

/**
 * Formats a byte count for people.
 * @param {number} bytes size
 * @returns {string} e.g. `12.3 KB`, counting 1024 bytes to a KB
 */
const formatSize = (bytes) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * Picks the marker for a size change: red grows, green shrinks.
 * @param {number} bytes difference in bytes
 * @returns {string} emoji
 */
const marker = (bytes) => (bytes > 0 ? "🔴" : bytes < 0 ? "🟢" : "⚪");

/**
 * Formats a size change, signed and marked red when it grows, green when it shrinks.
 * @param {number} bytes difference in bytes
 * @param {number} before size it is relative to
 * @returns {string} e.g. `🔴 +1.2 KB (+3.4%)`
 */
const formatDelta = (bytes, before) => {
	if (bytes === 0) return `${marker(0)} no change`;
	const sign = bytes < 0 ? "−" : "+";
	const percent = before
		? ` (${sign}${Math.abs((bytes / before) * 100).toFixed(1)}%)`
		: "";
	return `${marker(bytes)} ${sign}${formatSize(Math.abs(bytes))}${percent}`;
};

/**
 * Groups rows by package name.
 * @param {ReportRow[]} rows report rows
 * @returns {Map<string, ReportRow[]>} the rows of each name
 */
const groupByName = (rows) => {
	/** @type {Map<string, ReportRow[]>} */
	const groups = new Map();
	for (const row of rows) {
		const list = groups.get(row.name);
		if (list) list.push(row);
		else groups.set(row.name, [row]);
	}
	return groups;
};

/**
 * Sums the size of rows.
 * @param {ReportRow[]} rows report rows
 * @returns {number} bytes
 */
const sumSize = (rows) => rows.reduce((sum, row) => sum + row.size, 0);

/**
 * Lists the versions of rows, with copy counts above one.
 * @param {ReportRow[]} rows rows of one package
 * @returns {string} e.g. `1.0.0, 2.0.0 (×2)`
 */
const formatVersions = (rows) =>
	rows
		.map((row) =>
			row.copies > 1 ? `${row.version} (×${row.copies})` : row.version
		)
		.join(", ");

/**
 * Escapes `\` and `|` so text stays inside one Markdown table cell.
 * @param {string} text cell text
 * @returns {string} escaped text
 */
const escapeCell = (text) => text.replace(/[\\|]/g, "\\$&");

/**
 * Renders what changed between the base commit's report and this one.
 * @param {ReportRow[]} base rows of the base commit
 * @param {ReportRow[]} rows rows of this commit
 * @returns {string[]} Markdown lines
 */
const toChanges = (base, rows) => {
	const before = groupByName(base);
	const after = groupByName(rows);
	/** @type {string[][]} */
	const added = [];
	/** @type {string[][]} */
	const removed = [];
	/** @type {string[][]} */
	const updated = [];
	for (const [name, list] of after) {
		const old = before.get(name);
		const size = sumSize(list);
		const path = list[0].path.join(" › ");
		if (!old) {
			added.push([
				name,
				"🔴 added",
				formatVersions(list),
				formatDelta(size, 0),
				path
			]);
			continue;
		}
		const oldSize = sumSize(old);
		if (formatVersions(old) === formatVersions(list) && oldSize === size) {
			continue;
		}
		const versions =
			formatVersions(old) === formatVersions(list)
				? formatVersions(list)
				: `${formatVersions(old)} → ${formatVersions(list)}`;
		updated.push([
			name,
			`${marker(size - oldSize)} updated`,
			versions,
			`${formatSize(oldSize)} → ${formatSize(size)}<br>${formatDelta(
				size - oldSize,
				oldSize
			)}`,
			path
		]);
	}
	for (const [name, list] of before) {
		if (after.has(name)) continue;
		const size = sumSize(list);
		removed.push([
			name,
			"🟢 removed",
			formatVersions(list),
			formatDelta(-size, size),
			`was ${list[0].path.join(" › ")}`
		]);
	}
	const total = sumSize(rows);
	const baseTotal = sumSize(base);
	const changes = [...added, ...removed, ...updated];
	return [
		"## Changes against the base commit",
		"",
		"🔴 added or grew · 🟢 removed or shrank · ⚪ same size",
		"",
		`**${before.size} → ${after.size}** packages, **${formatSize(
			baseTotal
		)} → ${formatSize(total)}** (${formatDelta(
			total - baseTotal,
			baseTotal
		)}): ${
			added.length
		} added, ${removed.length} removed, ${updated.length} updated.`,
		"",
		...(changes.length === 0
			? ["No dependency was added, removed or updated."]
			: [
					"| Package | Change | Version | Size | Path |",
					"| ------- | ------ | ------- | ---: | ---- |",
					...changes.map((cells) => `| ${cells.join(" | ")} |`)
				]),
		""
	];
};

/**
 * Renders the rows as a Markdown report.
 * @param {ReportRow[]} rows report rows
 * @param {Record<string, string>} installed versions of the requested packages
 * @param {ReportRow[]=} base rows of the base commit, to show what changed
 * @param {boolean=} comment whether to render the pull request comment, which
 * opens with its marker and folds the full table away while it fits
 * @returns {string} Markdown
 */
const toMarkdown = (rows, installed, base, comment) => {
	const total = sumSize(rows);
	const copies = rows.reduce((sum, row) => sum + row.copies, 0);
	const requested = Object.keys(installed)
		.map((name) => `\`${name}@${installed[name]}\``)
		.join(", ");
	const packages = [...groupByName(rows).values()];
	/**
	 * @param {ReportRow[]} list rows of one package
	 * @returns {boolean} whether npm installed it more than once
	 */
	const isDuplicated = (list) => list.length > 1 || list[0].copies > 1;
	const duplicated = packages.filter(isDuplicated);
	// Duplicated packages lead, as removing a copy is what the table is for.
	const ordered = [
		...duplicated,
		...packages.filter((list) => !isDuplicated(list))
	];
	const installedSection = [
		"## Installed dependencies",
		"",
		`Installing ${requested} pulls in **${packages.length}** packages (${
			rows.length
		} versions, ${copies} copies on disk), **${formatSize(
			total
		)}** in total (dependencies only, no devDependencies).`,
		"",
		`⚠️ ${duplicated.length} packages are installed more than once, in several versions or copies; they come first.`,
		"",
		"Parent packages name the version range each one asks for; the path is the shortest chain from a requested package.",
		"",
		"| Name | Versions | Size | Parent packages and path |",
		"| ---- | -------- | ---: | ------------------------ |",
		...ordered.map((list) => {
			const name = isDuplicated(list) ? `⚠️ ${list[0].name}` : list[0].name;
			const origins = list.map((row) => {
				const origin = `${escapeCell(row.parents.join(", "))}<br>path: ${row.path.join(" › ")}`;
				return list.length > 1 ? `**${row.version}**: ${origin}` : origin;
			});
			return `| ${name} | ${formatVersions(list)} | ${formatSize(
				sumSize(list)
			)} | ${origins.join("<br>")} |`;
		}),
		""
	];
	const changes = base ? toChanges(base, rows) : [];
	if (!comment) {
		return [...changes, ...installedSection].join("\n");
	}
	// A scoped name such as `@types/node` would mention a GitHub user or team.
	const head = [COMMENT_MARKER, ...changes].join("\n").replace(/@/g, "@\u200B");
	const table = [
		`<details><summary>Installed dependencies: ${packages.length} packages, ${duplicated.length} duplicated</summary>`,
		"",
		...installedSection,
		"</details>",
		""
	]
		.join("\n")
		.replace(/@/g, "@\u200B");
	return `${head}\n${
		head.length + table.length < MAX_COMMENT_LENGTH
			? table
			: "The full table is in this run's job summary and artifact.\n"
	}`;
};

/**
 * Installs the requested packages, `webpack` as declared by a checkout.
 * @param {string} root webpack checkout whose `package.json` to install
 * @returns {{ rows: ReportRow[], installed: Record<string, string> }} the
 * rows of every package they pull in, and the version of each requested one
 */
const install = (root) => {
	const dir = fs.mkdtempSync(
		path.join(os.tmpdir(), "webpack-dependency-report-")
	);
	try {
		// WHY: `npm pack` runs `prepare` (husky) even with `--ignore-scripts`, and
		// webpack is left out of the report, so a stub carrying only the fields
		// npm installs from stands in for the checkout.
		const manifest = JSON.parse(
			fs.readFileSync(path.join(root, "package.json"), "utf8")
		);
		fs.mkdirSync(path.join(dir, "webpack"));
		fs.writeFileSync(
			path.join(dir, "webpack", "package.json"),
			JSON.stringify({
				name: manifest.name,
				version: manifest.version,
				dependencies: manifest.dependencies,
				optionalDependencies: manifest.optionalDependencies,
				peerDependencies: manifest.peerDependencies,
				peerDependenciesMeta: manifest.peerDependenciesMeta
			})
		);
		/** @type {Record<string, string>} */
		const dependencies = {};
		for (const name of PACKAGES) {
			dependencies[name] = name === "webpack" ? "file:./webpack" : "latest";
		}
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
				"--install-links",
				"--ignore-scripts",
				"--no-audit",
				"--no-fund"
			],
			dir
		);
		const rows = collect(dir);
		/** @type {Record<string, string>} */
		const installed = {};
		for (const name of PACKAGES) {
			const row = rows.find(
				(row) => row.name === name && row.parents.includes(DIRECT)
			);
			installed[name] = row ? row.version : "?";
		}
		return {
			rows: rows.filter((row) => !PACKAGES.includes(row.name)),
			installed
		};
	} finally {
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		fs.rmSync(dir, { recursive: true, force: true });
	}
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

const values = {
	output: readFlag("output"),
	json: readFlag("json"),
	comment: readFlag("comment"),
	base: readFlag("base")
};

const { rows, installed } = install(ROOT);
const base = values.base ? install(path.resolve(values.base)).rows : undefined;
const markdown = toMarkdown(rows, installed, base);
if (values.output) fs.writeFileSync(values.output, markdown);
else process.stdout.write(markdown);
if (values.comment) {
	fs.writeFileSync(values.comment, toMarkdown(rows, installed, base, true));
}
if (values.json) {
	fs.writeFileSync(values.json, `${JSON.stringify(rows, null, 2)}\n`);
}
