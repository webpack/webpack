/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Shared machinery for `compare-css-tools.js` and `compare-html-tools.js`: the
// package cache they install into, and the worker that measures one cell.

// The packages compared against are NOT webpack dependencies: each script
// installs its own into `node_modules/.cache/`, never webpack's own tree.

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");

// What a comparison measures, in the order the tables are printed. `parse`
// builds the tree and stops; the other two print it back out.
const STAGES = ["parse", "beautify", "minify"];

/**
 * @typedef {object} Tool
 * @property {string} name how the row is labelled
 * @property {string} stage which table it belongs to
 * @property {() => ((source: string) => EXPECTED_ANY)} create builds the callable, loading only what it needs
 */

/**
 * @param {string} message progress line
 */
const log = (message) => {
	process.stderr.write(`${message}\n`);
};

/**
 * @param {string} file a path
 * @returns {Promise<boolean>} whether it exists
 */
const exists = (file) =>
	fs.promises.access(file).then(
		() => true,
		() => false
	);

/**
 * @param {string} command executable
 * @param {string[]} args its arguments
 * @param {object=} options spawn options
 * @returns {Promise<void>} resolves when it exits cleanly
 */
const run = (command, args, options) =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["ignore", "inherit", "inherit"],
			...options
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} exited with ${code}`));
		});
	});

/**
 * Install the comparison packages under `node_modules/.cache/<name>`, reusing
 * what is there unless the list changed.
 * @param {string} name cache directory name
 * @param {string[]} packages what to install
 * @returns {Promise<string>} the cache directory
 */
const installPackages = async (name, packages) => {
	const cache = path.join(ROOT, "node_modules/.cache", name);
	const modules = path.join(cache, "node_modules");
	const manifest = path.join(cache, "package.json");
	// Reinstall when the list changes, so an existing cache picks up newly added
	// fixtures instead of failing on their missing files.
	const installed =
		(await exists(modules)) && (await exists(manifest))
			? JSON.parse(await fs.promises.readFile(manifest, "utf8"))
					.comparisonPackages
			: undefined;
	if (JSON.stringify(installed) === JSON.stringify(packages)) return cache;
	log(`installing comparison packages into ${path.relative(ROOT, cache)} …`);
	await fs.promises.mkdir(cache, { recursive: true });
	if (!(await exists(manifest))) {
		await fs.promises.writeFile(
			manifest,
			`${JSON.stringify({ name, private: true }, null, 2)}\n`
		);
	}
	await run("npm", ["install", "--no-audit", "--no-fund", ...packages], {
		cwd: cache
	});
	// Recorded only after the install succeeded.
	const written = JSON.parse(await fs.promises.readFile(manifest, "utf8"));
	written.comparisonPackages = packages;
	await fs.promises.writeFile(
		manifest,
		`${JSON.stringify(written, null, 2)}\n`
	);
	return cache;
};

/**
 * Load one comparison package by name, resolved from the cache as a bare
 * specifier: `require` of a joined path skips the `exports` map, so a package
 * that ships one and no `main` would read as missing.
 * @param {string} cache the comparison cache directory
 * @returns {(name: string) => EXPECTED_ANY} loads one comparison package
 */
const loaderFor = (cache) => (name) => {
	try {
		return require(require.resolve(name, { paths: [cache] }));
	} catch (_error) {
		return require(path.join(cache, "node_modules", name));
	}
};

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);
// Node < 22.15 has no zstd in zlib — the column reads "-" there.
const zstdCompress =
	typeof zlib.zstdCompress === "function"
		? promisify(zlib.zstdCompress)
		: undefined;

/**
 * @param {Buffer} buffer content
 * @returns {Promise<number | undefined>} the zstd size, where zlib has zstd
 */
const zstdSize = async (buffer) => {
	if (zstdCompress === undefined) return undefined;
	return (
		await zstdCompress(buffer, {
			params: { [zlib.constants.ZSTD_c_compressionLevel]: 19 }
		})
	).length;
};

/** @typedef {{ raw: number, gzip: number, brotli: number, zstd: number | undefined }} Sizes */

/**
 * What the bytes weigh under the encodings a CDN serves — the same settings as
 * `test/CodeSizeTestCases.size.js`, so numbers line up across the two reports.
 * @param {Buffer} buffer content
 * @returns {Promise<Sizes>} its size under each encoding
 */
const compress = async (buffer) => ({
	raw: buffer.length,
	gzip: (await gzip(buffer, { level: 9 })).length,
	brotli: (
		await brotliCompress(buffer, {
			params: {
				[zlib.constants.BROTLI_PARAM_QUALITY]: 11,
				[zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length
			}
		})
	).length,
	zstd: await zstdSize(buffer)
});

/**
 * @param {number | undefined} bytes a byte count
 * @returns {string} the count in KB, one decimal ("-" when unmeasurable)
 */
const kb = (bytes) =>
	bytes === undefined ? "-" : `${(bytes / 1024).toFixed(1)} KB`;

/** @typedef {{ code: string | undefined, wall: number, cpu: number, peak: number } | { error: string }} Measurement */

// Held across the timing loop so a parse whose tree is never read cannot be
// taken for dead code.
/** @type {EXPECTED_ANY} */
let sink;

/**
 * This process's own peak resident size, in KB. `resourceUsage().maxRSS` cannot
 * answer it here: Linux carries the high-water mark across `fork`+`exec`, so a
 * spawned worker reports whatever the parent had reached.
 * @returns {number} the peak, or 0 where nothing can measure it
 */
const peakResidentKilobytes = () => {
	try {
		const status = fs.readFileSync("/proc/self/status", "utf8");
		const found = /VmHWM:\s+(\d+)/.exec(status);
		if (found !== null) return Number(found[1]);
	} catch (_error) {
		// Not Linux; the platform's own accounting is all there is.
	}
	return process.resourceUsage().maxRSS;
};

/**
 * Worker mode: run one tool over the source on stdin and report what it cost.
 * Wall and cpu are the best of three runs; peak is this worker's own high-water
 * resident size (KB), which deliberately includes loading the tool.
 * @param {Tool[]} tools every tool this script offers
 * @returns {Promise<void>} resolves after the report is written
 */
const measure = async (tools) => {
	const [, , , stage, name] = process.argv;
	const tool = tools.find(
		(entry) => entry.name === name && entry.stage === stage
	);
	if (tool === undefined) throw new Error(`unknown ${stage} tool ${name}`);
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	const source = Buffer.concat(chunks).toString("utf8");
	/** @type {Measurement} */
	let report;
	try {
		const call = tool.create();
		// Timing from cold reports a JavaScript tool's warm-up rather than its
		// throughput, and a build processes many assets in one process.

		// Bounded by time as well as by count, so a slow tool on a large input is
		// not multiplied while a fast one still reaches its steady state.
		const warmStarted = process.hrtime.bigint();
		for (let i = 0; i < 8; i++) {
			sink = await call(source);
			if (Number(process.hrtime.bigint() - warmStarted) / 1e6 > 500) break;
		}
		let wall = Infinity;
		let cpu = Infinity;
		for (let i = 0; i < 3; i++) {
			const cpuStarted = process.cpuUsage();
			const started = process.hrtime.bigint();
			sink = await call(source);
			wall = Math.min(wall, Number(process.hrtime.bigint() - started) / 1e6);
			const used = process.cpuUsage(cpuStarted);
			cpu = Math.min(cpu, (used.user + used.system) / 1e3);
		}
		// A parse hands back a tree, which is measured but never reported; the two
		// printing stages must hand back the text they wrote.
		const code = stage === "parse" ? undefined : String(sink);
		report = { code, wall, cpu, peak: peakResidentKilobytes() };
	} catch (error) {
		report = {
			error: String(
				error && /** @type {Error} */ (error).message
					? /** @type {Error} */ (error).message
					: error
			).split("\n", 1)[0]
		};
	}
	process.stdout.write(JSON.stringify(report));
};

/**
 * @param {string} entry the calling script's path
 * @param {string} stage which table the row belongs to
 * @param {string} name the tool's name
 * @param {string} input the source to run it over
 * @returns {Promise<Measurement>} the worker's report
 */
const measureInWorker = (entry, stage, name, input) =>
	new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [entry, "--measure", stage, name], {
			stdio: ["pipe", "pipe", "inherit"]
		});
		/** @type {Buffer[]} */
		const chunks = [];
		child.stdout.on("data", (chunk) => chunks.push(chunk));
		child.on("error", reject);
		child.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(`measuring ${name} exited with ${code}`));
				return;
			}
			resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
		});
		child.stdin.end(input);
	});

/**
 * Narrow a run to what an env var names, so one fixture or one tool can be
 * re-measured without the whole matrix.
 * @param {string} variable env var name
 * @returns {(value: string) => boolean} whether that row is wanted
 */
const filterFrom = (variable) => {
	const wanted = process.env[variable];
	if (!wanted) return () => true;
	const lowered = wanted.toLowerCase();
	return (value) => value.toLowerCase().includes(lowered);
};

module.exports = {
	STAGES,
	compress,
	exists,
	filterFrom,
	installPackages,
	kb,
	loaderFor,
	log,
	measure,
	measureInWorker,
	run
};
