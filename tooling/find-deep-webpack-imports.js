/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Reports which `webpack/lib/…` paths the published ecosystem imports directly,
// and which of them this checkout no longer resolves. A path a popular package
// reaches for and webpack no longer has is a break a re-export would prevent.

const cp = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const LIB_ROOT = path.join(__dirname, "..", "lib");
const CACHE_ROOT = path.join(
	__dirname,
	"..",
	"node_modules",
	".cache",
	"deep-webpack-imports"
);
const REGISTRY = "https://registry.npmjs.org";

// The search endpoint carries weekly downloads with each hit, so discovery and
// ranking come from one set of calls; api.npmjs.org is not needed.
const SEARCH_PAGE_SIZE = 250;

const KEYWORDS = [
	{ keyword: "webpack-plugin", label: "plugin" },
	{ keyword: "webpack-loader", label: "loader" }
];

// Every spelling a package can name a webpack internal with. The `.js` a few
// of them write is stripped before the path is looked up.
const SPECIFIER_REGEXP =
	/["'`](webpack\/lib\/[^"'`\n]+)["'`]|["'`]webpack\/lib\/["'`]\s*\+/g;

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
 * Downloads a package's tarball and extracts it, reusing a previous extract.
 * Only reads the archive — no install runs, so no lifecycle script executes.
 * @param {string} name package name
 * @returns {Promise<string | null>} the extracted directory, or null when unavailable
 */
const extractPackage = async (name) => {
	const target = path.join(CACHE_ROOT, name.replace("/", "+"));

	if (fs.existsSync(path.join(target, "package"))) {
		return path.join(target, "package");
	}

	let tarball;

	try {
		const packument = await fetchJson(
			`${REGISTRY}/${name.replace("/", "%2f")}`
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
 * Discovers, downloads and scans, then prints what the ecosystem reaches for.
 * @param {number} perKeyword how many packages to take per keyword
 * @returns {Promise<number>} the number of requests this checkout cannot resolve
 */
const run = async (perKeyword) => {
	fs.mkdirSync(CACHE_ROOT, { recursive: true });

	/** @type {Map<string, { packages: Set<string>, weekly: number }>} */
	const byRequest = new Map();
	/** @type {{ name: string, weekly: number }[]} */
	const dynamicPackages = [];
	let scanned = 0;
	let unavailable = 0;

	for (const { keyword, label } of KEYWORDS) {
		const packages = await searchByKeyword(keyword, perKeyword);

		process.stderr.write(
			`Scanning ${packages.length} ${label}(s) by weekly downloads\n`
		);

		for (const { name, weekly } of packages) {
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

	const missing = rows.filter((row) => !row.resolves);

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

			process.stdout.write(
				`webpack/${row.request} | ${formatCount(row.weekly)} | ${names}${more} | ${
					row.resolves ? "yes" : "NO"
				}\n`
			);
		}
	}

	if (missing.length > 0) {
		process.stdout.write(
			`\n${missing.length} request(s) this checkout does not resolve — each ` +
				"needs a re-export at the old path, or is a deliberate removal:\n"
		);

		for (const row of missing) {
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

	return missing.length;
};

const perKeyword = Number(process.env.COUNT || 100);

run(perKeyword).then(
	(missing) => {
		process.exitCode = missing > 0 ? 1 : 0;
	},
	(error) => {
		process.stderr.write(`${error.stack}${os.EOL}`);
		process.exitCode = 1;
	}
);
