/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Records which `webpack/lib/…` paths the published ecosystem imports directly.
// `--write` refreshes that record from npm; `--check` reads no network and fails
// when a recorded path stopped resolving, which is a move owing a re-export.

const cp = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const prettier = require("prettier");

const LIB_ROOT = path.join(__dirname, "..", "lib");
const CACHE_ROOT = path.join(
	__dirname,
	"..",
	"node_modules",
	".cache",
	"deep-webpack-imports"
);
const RECORD_PATH = path.join(__dirname, "deep-webpack-imports.json");
const REGISTRY = "https://registry.npmjs.org";

// The search endpoint carries weekly downloads with each hit, so discovery and
// ranking come from one set of calls; api.npmjs.org is not needed.
const SEARCH_PAGE_SIZE = 250;

const KEYWORDS = [
	{ keyword: "webpack", label: "webpack package" },
	{ keyword: "webpack-plugin", label: "plugin" },
	{ keyword: "webpack-loader", label: "loader" }
];

// Every spelling a package imports a webpack internal with; the `.js` a few
// write is stripped before lookup. Matching import positions only skips the
// `makeSerializable` requests a package that bundled webpack carries.
const IMPORT_PREFIX = String.raw`(?:(?:require|import)(?:\.resolve)?\s*\(\s*|from\s+)`;
const SPECIFIER_REGEXP = new RegExp(
	`${IMPORT_PREFIX}["'\`](webpack/lib/[^"'\`\\n]+)["'\`]|${IMPORT_PREFIX}["'\`]webpack/lib/["'\`]\\s*\\+`,
	"g"
);

// A package name arrives from the registry, so nothing derived from it is
// trusted as a path: every character outside this set becomes a `+`.
const UNSAFE_NAME_CHARACTER_REGEXP = /[^a-zA-Z0-9._-]/g;

const SOURCE_EXTENSIONS = new Set([
	".js",
	".mjs",
	".cjs",
	".ts",
	".mts",
	".cts"
]);

/**
 * Fetches a url and returns its body, following redirects. Each response is
 * drained before the socket is reused.
 * @param {string} url url to fetch
 * @returns {Promise<Buffer>} the response body
 */
const fetchBuffer = (url) =>
	new Promise((resolve, reject) => {
		require("https")
			.get(
				url,
				{ headers: { "user-agent": "webpack/find-deep-webpack-imports" } },
				(res) => {
					const status = /** @type {number} */ (res.statusCode);

					if (status >= 301 && status <= 308 && res.headers.location) {
						res.resume();
						return fetchBuffer(
							new URL(res.headers.location, url).toString()
						).then(resolve, reject);
					}

					if (status !== 200) {
						res.resume();
						return reject(new Error(`${status} for ${url}`));
					}

					/** @type {Buffer[]} */
					const chunks = [];

					res.on("data", (chunk) => chunks.push(chunk));
					res.on("end", () => resolve(Buffer.concat(chunks)));
				}
			)
			.on("error", reject);
	});

/**
 * @param {string} url url returning JSON
 * @returns {Promise<EXPECTED_ANY>} the parsed body
 */
const fetchJson = async (url) =>
	JSON.parse((await fetchBuffer(url)).toString());

/**
 * Returns the most downloaded packages carrying a keyword, best first.
 * @param {string} keyword npm keyword to search for
 * @param {number} count how many packages to keep
 * @returns {Promise<{ name: string, weekly: number }[]>} ranked packages
 */
const searchByKeyword = async (keyword, count) => {
	/** @type {Map<string, number>} */
	const weeklyByName = new Map();

	for (let from = 0; from < SEARCH_PAGE_SIZE * 4; from += SEARCH_PAGE_SIZE) {
		const url = `${REGISTRY}/-/v1/search?text=${encodeURIComponent(
			`keywords:${keyword}`
		)}&size=${SEARCH_PAGE_SIZE}&from=${from}`;
		const { objects } = await fetchJson(url);

		if (!objects || objects.length === 0) break;

		for (const object of objects) {
			const name = object.package.name;
			// webpack itself and its forks name lib/ paths as their own source.
			if (name === "webpack" || name.startsWith("webpack/")) continue;
			weeklyByName.set(name, object.downloads ? object.downloads.weekly : 0);
		}

		if (objects.length < SEARCH_PAGE_SIZE) break;
	}

	return [...weeklyByName]
		.map(([name, weekly]) => ({ name, weekly }))
		.sort((a, b) => b.weekly - a.weekly)
		.slice(0, count);
};

/**
 * Returns the directory a package caches in, which cannot leave CACHE_ROOT
 * however the registry spelled the name.
 * @param {string} name package name
 * @returns {string} the directory
 */
const cacheDirectoryFor = (name) =>
	path.join(CACHE_ROOT, name.replace(UNSAFE_NAME_CHARACTER_REGEXP, "+"));

/**
 * Downloads a package's tarball and extracts it, reusing a previous extract.
 * Only reads the archive — no install runs, so no lifecycle script executes.
 * @param {string} name package name
 * @returns {Promise<string | null>} the extracted directory, or null when unavailable
 */
const extractPackage = async (name) => {
	const target = cacheDirectoryFor(name);

	if (fs.existsSync(path.join(target, "package"))) {
		return path.join(target, "package");
	}

	let tarball;

	try {
		const packument = await fetchJson(
			`${REGISTRY}/${name.replace(/\//g, "%2f")}`
		);
		const latest = packument["dist-tags"] && packument["dist-tags"].latest;
		if (!latest) return null;
		tarball = packument.versions[latest].dist.tarball;
	} catch (_error) {
		return null;
	}

	fs.mkdirSync(target, { recursive: true });

	const archive = path.join(target, "package.tgz");

	try {
		fs.writeFileSync(archive, await fetchBuffer(tarball));
		cp.execFileSync("tar", ["-xzf", archive, "-C", target], {
			stdio: "ignore"
		});
	} catch (_error) {
		return null;
	} finally {
		if (fs.existsSync(archive)) fs.unlinkSync(archive);
	}

	const extracted = path.join(target, "package");

	return fs.existsSync(extracted) ? extracted : null;
};

/**
 * @param {string} dir directory to walk
 * @param {string[]} found accumulator
 * @returns {string[]} every source file under dir
 */
const walkSourceFiles = (dir, found = []) => {
	let entries;

	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (_error) {
		return found;
	}

	for (const entry of entries) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			if (entry.name === "node_modules" || entry.name === ".git") continue;
			walkSourceFiles(full, found);
		} else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
			found.push(full);
		}
	}

	return found;
};

/**
 * Returns whether this checkout still resolves a `webpack/lib/…` request.
 * @param {string} request request without the `webpack/` prefix
 * @returns {boolean} whether the file is there
 */
const resolvesInCheckout = (request) => {
	const withoutLib = request.replace(/^lib\//, "").replace(/\.js$/, "");
	const base = path.join(LIB_ROOT, withoutLib);

	return (
		fs.existsSync(`${base}.js`) ||
		fs.existsSync(path.join(base, "index.js")) ||
		fs.existsSync(base)
	);
};

/**
 * Collects every `webpack/lib/…` request a package's published files name.
 * @param {string} dir extracted package directory
 * @returns {{ requests: Set<string>, dynamic: boolean }} what it reaches for
 */
const scanPackage = (dir) => {
	/** @type {Set<string>} */
	const requests = new Set();
	let dynamic = false;

	for (const file of walkSourceFiles(dir)) {
		let source;

		try {
			source = fs.readFileSync(file, "utf8");
		} catch (_error) {
			continue;
		}

		if (!source.includes("webpack/lib/")) continue;

		for (const match of source.matchAll(SPECIFIER_REGEXP)) {
			if (match[1] === undefined) {
				dynamic = true;
				continue;
			}
			requests.add(match[1].replace(/^webpack\//, ""));
		}
	}

	return { requests, dynamic };
};

/**
 * @param {number} value a download count
 * @returns {string} the count with thousands separators
 */
const formatCount = (value) => value.toLocaleString("en-US");

/**
 * @returns {EXPECTED_ANY} the recorded scan, or an empty one
 */
const readRecord = () => {
	if (!fs.existsSync(RECORD_PATH)) {
		return { sampledAt: null, perKeyword: 0, removed: {}, requests: {} };
	}

	return JSON.parse(fs.readFileSync(RECORD_PATH, "utf8"));
};

/**
 * Verifies every recorded request against this checkout, reading no network.
 * This is the cheap half: it catches a move the moment it lands.
 * @returns {number} how many recorded requests no longer resolve
 */
const check = () => {
	const record = readRecord();
	const requests = Object.keys(record.requests).sort();

	if (requests.length === 0) {
		process.stdout.write(
			`No record at ${path.relative(process.cwd(), RECORD_PATH)}; ` +
				"run with --write to collect one.\n"
		);

		return 0;
	}

	const broken = requests.filter(
		(request) => !(request in record.removed) && !resolvesInCheckout(request)
	);

	process.stdout.write(
		`Checked ${requests.length} recorded request(s) against this checkout ` +
			`(sampled ${record.sampledAt}).\n`
	);

	for (const request of broken) {
		const entry = record.requests[request];

		process.stdout.write(
			`  webpack/${request} no longer resolves — ${formatCount(
				entry.weekly
			)} weekly across ${entry.packages.length} package(s): ${entry.packages.join(
				", "
			)}\n`
		);
	}

	if (broken.length > 0) {
		process.stdout.write(
			"\nRe-export each at its old path, or record it under `removed` with " +
				"the reason it is deliberate.\n"
		);
	}

	return broken.length;
};

/**
 * Writes the record prettier-formatted, so a refresh never fails `fmt:check`.
 * @param {{ request: string, packages: string[], weekly: number }[]} rows scanned rows
 * @param {number} perKeyword how many packages per keyword produced them
 * @returns {Promise<void>} once written
 */
const writeRecord = async (rows, perKeyword) => {
	const previous = readRecord();
	/** @type {EXPECTED_ANY} */
	const requests = {};

	for (const row of [...rows].sort((a, b) =>
		a.request.localeCompare(b.request)
	)) {
		requests[row.request] = { weekly: row.weekly, packages: row.packages };
	}

	const record = {
		sampledAt: new Date().toISOString().slice(0, 10),
		perKeyword,
		removed: previous.removed,
		requests
	};

	const prettierConfig = (await prettier.resolveConfig(RECORD_PATH)) || {};

	fs.writeFileSync(
		RECORD_PATH,
		await prettier.format(JSON.stringify(record), {
			...prettierConfig,
			filepath: RECORD_PATH
		})
	);
	process.stdout.write(
		`\nWrote ${path.relative(process.cwd(), RECORD_PATH)}.\n`
	);
};

/**
 * Discovers, downloads and scans, then prints what the ecosystem reaches for.
 * @param {number} perKeyword how many packages to take per keyword
 * @param {boolean} write whether to refresh the record with what it found
 * @returns {Promise<number>} how many requests this checkout cannot resolve
 */
const collect = async (perKeyword, write) => {
	fs.mkdirSync(CACHE_ROOT, { recursive: true });

	const record = readRecord();
	/** @type {Map<string, { packages: Set<string>, weekly: number }>} */
	const byRequest = new Map();
	/** @type {{ name: string, weekly: number }[]} */
	const dynamicPackages = [];
	// The broad keyword overlaps the narrow ones, so a package they share is
	// scanned once and counted once.
	/** @type {Set<string>} */
	const seen = new Set();
	let scanned = 0;
	let unavailable = 0;

	for (const { keyword, label } of KEYWORDS) {
		const packages = await searchByKeyword(keyword, perKeyword);

		process.stderr.write(
			`Scanning ${packages.length} ${label}(s) by weekly downloads\n`
		);

		for (const { name, weekly } of packages) {
			if (seen.has(name)) continue;

			seen.add(name);

			const dir = await extractPackage(name);

			if (dir === null) {
				unavailable++;
				continue;
			}

			scanned++;

			const { requests, dynamic } = scanPackage(dir);

			if (dynamic) dynamicPackages.push({ name, weekly });

			for (const request of requests) {
				const entry = byRequest.get(request) || {
					packages: new Set(),
					weekly: 0
				};

				if (!entry.packages.has(name)) {
					entry.packages.add(name);
					entry.weekly += weekly;
				}

				byRequest.set(request, entry);
			}
		}
	}

	const rows = [...byRequest]
		.map(([request, entry]) => ({
			request,
			packages: [...entry.packages].sort(),
			weekly: entry.weekly,
			resolves: resolvesInCheckout(request)
		}))
		.sort((a, b) => b.weekly - a.weekly);

	const broken = rows.filter(
		(row) => !row.resolves && !(row.request in record.removed)
	);
	const fresh = rows.filter((row) => !(row.request in record.requests));

	process.stdout.write(
		`\nScanned ${scanned} package(s); ${unavailable} could not be fetched.\n` +
			`${rows.length} distinct webpack/lib/ request(s) found.\n\n`
	);

	if (rows.length > 0) {
		process.stdout.write("Request | Weekly | Packages | Resolves here\n");
		process.stdout.write("--- | --: | --- | ---\n");

		for (const row of rows) {
			const names = row.packages.slice(0, 4).join(", ");
			const more =
				row.packages.length > 4 ? ` +${row.packages.length - 4}` : "";
			const verdict = row.resolves
				? "yes"
				: row.request in record.removed
					? "no, recorded as removed"
					: "NO";

			process.stdout.write(
				`webpack/${row.request} | ${formatCount(row.weekly)} | ${names}${more} | ${verdict}\n`
			);
		}
	}

	if (fresh.length > 0) {
		process.stdout.write(
			`\n${fresh.length} request(s) the record has not seen before; ` +
				"re-run with --write to keep it current:\n"
		);

		for (const row of fresh) {
			process.stdout.write(
				`  webpack/${row.request}  (${formatCount(row.weekly)} weekly)\n`
			);
		}
	}

	if (broken.length > 0) {
		process.stdout.write(
			`\n${broken.length} request(s) this checkout does not resolve and the ` +
				"record does not excuse:\n"
		);

		for (const row of broken) {
			process.stdout.write(
				`  webpack/${row.request}  (${formatCount(row.weekly)} weekly, ${
					row.packages.length
				} package(s))\n`
			);
		}
	}

	if (dynamicPackages.length > 0) {
		process.stdout.write(
			`\n${dynamicPackages.length} package(s) build the request at runtime, ` +
				"so no path can be read from the source:\n"
		);

		for (const { name, weekly } of dynamicPackages) {
			process.stdout.write(`  ${name}  (${formatCount(weekly)} weekly)\n`);
		}
	}

	if (write) await writeRecord(rows, perKeyword);

	return broken.length;
};

const perKeyword = Number(process.env.COUNT || 200);
const write = process.argv.includes("--write");
const offline = process.argv.includes("--check");

(offline ? Promise.resolve(check()) : collect(perKeyword, write)).then(
	(broken) => {
		process.exitCode = broken > 0 ? 1 : 0;
	},
	(error) => {
		process.stderr.write(`${error.stack}${os.EOL}`);
		process.exitCode = 1;
	}
);
