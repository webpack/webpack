/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Shared machinery for `compare-css-tools.js`, `compare-html-tools.js` and
// `compare-js-tools.js`: the package cache they install into, the worker that
// measures one cell, and the relations their invariant sweeps hold.

// The packages compared against are NOT webpack dependencies: each script
// installs its own into `node_modules/.cache/`, never webpack's own tree.

const { spawn } = require("child_process");
const { createHash } = require("crypto");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { promisify } = require("util");
const zlib = require("zlib");
const {
	cutsAt,
	firstDifference,
	hasher,
	idempotence,
	oneLine,
	pathSpanWalk,
	purityRelation,
	shrink,
	signed,
	sliceRelation,
	spans,
	thrownText
} = require("../test/helpers/syntaxInvariants/relations");

/** @typedef {import("../test/helpers/syntaxInvariants/relations").Report} Report */

const ROOT = path.resolve(__dirname, "..");

// What a comparison measures, in the order the tables are printed. `parse`
// builds the tree and stops; the other two print it back out.
const STAGES = ["parse", "beautify", "minify"];

/**
 * @typedef {object} Tool
 * @property {string} name how the row is labelled
 * @property {string} stage which table it belongs to
 * @property {() => ((source: string) => EXPECTED_ANY)} create builds the callable, loading only what it needs
 * @property {boolean=} external whether it works in a service process of its own
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
		// Handed the environment this process holds rather than the one the
		// spawn defaults to, so a caller's own `PATH` is what names the command.
		const child = spawn(command, args, {
			stdio: ["ignore", "inherit", "inherit"],
			env: process.env,
			...options
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} exited with ${code}`));
		});
	});

/**
 * Where a corpus is declared: `tooling/comparison/<name>/`, holding the
 * package.json a comparison installs and the lockfile pinning what that
 * resolves to.
 * @param {string} name cache directory name, which is also the corpus directory
 * @returns {string} the corpus directory
 */
const corpusDirectory = (name) => path.join(ROOT, "tooling/comparison", name);

// What a corpus is declared by, and so what decides whether one is current.
const MANIFEST_FILES = ["package.json", "package-lock.json"];

/**
 * Install a corpus under `node_modules/.cache/<name>` from its committed
 * manifest, reusing what is there while the lockfile it was installed from
 * still matches.
 * @param {string} name cache directory name
 * @returns {Promise<string>} the cache directory
 */
const installPackages = async (name) => {
	const source = corpusDirectory(name);
	const cache = path.join(ROOT, "node_modules/.cache", name);
	const modules = path.join(cache, "node_modules");
	// What this cache was last installed from, written only once the install
	// succeeded — a restored cache reinstalls nothing, a stale one does.
	const stamp = path.join(cache, ".corpus-lock");
	// Both files, because either one alone decides too little: a manifest edited
	// without regenerating the lockfile is what `npm ci` refuses, and reading the
	// lockfile only would skip the install that would have refused it.
	const identity = createHash("sha256");
	for (const file of MANIFEST_FILES) {
		identity.update(await fs.promises.readFile(path.join(source, file)));
		identity.update("\0");
	}
	const wanted = identity.digest("hex");
	const installed =
		(await exists(modules)) && (await exists(stamp))
			? await fs.promises.readFile(stamp, "utf8")
			: undefined;
	if (installed === wanted) return cache;
	log(`installing comparison packages into ${path.relative(ROOT, cache)} …`);
	// `npm ci` refreshes `node_modules` alone, so a stylesheet the last corpus
	// generated would outlive the tool that wrote it and pass for current under
	// the new stamp. Everything here is derived, so none of it survives.
	await fs.promises.rm(cache, { recursive: true, force: true });
	await fs.promises.mkdir(cache, { recursive: true });
	// `npm ci` reads both out of its working directory and installs exactly what
	// the lockfile names, so the corpus is what was committed rather than
	// whatever the registry serves today.
	for (const file of MANIFEST_FILES) {
		await fs.promises.copyFile(path.join(source, file), path.join(cache, file));
	}
	await run("npm", ["ci", "--no-audit", "--no-fund"], { cwd: cache });
	await fs.promises.writeFile(stamp, wanted);
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

/**
 * The legal notices a source carries. A `/*!` comment is the convention every
 * minifier is meant to preserve, so dropping one loses the copyright a license
 * requires as silently as a dropped class loses a rule.
 * @param {string} source a stylesheet or a script
 * @returns {number} how many it carries
 */
const legalNotices = (source) => {
	let count = 0;
	let at = 0;
	while (at < source.length) {
		const char = source[at];
		if (char === '"' || char === "'") {
			at++;
			while (at < source.length && source[at] !== char) {
				at += source[at] === "\\" ? 2 : 1;
			}
			at++;
			continue;
		}
		// Only an opener starts one, so `/*!` inside a string or another comment
		// is the text it sits in rather than a notice of its own.
		if (char !== "/" || source[at + 1] !== "*") {
			at++;
			continue;
		}
		const end = source.indexOf("*/", at + 2);
		if (end === -1) break;
		if (source[at + 2] === "!") count++;
		at = end + 2;
	}
	return count;
};

/**
 * What a tool's output no longer carries, as the comparison's last column: a
 * size win that drops a class or a legal notice is not a size win.
 * @param {number} classes how many classes its selectors stopped matching
 * @param {string[]} examples a few of them, named so the row can be chased
 * @param {number} notices how many legal notices it dropped
 * @returns {string} the column, "-" when it lost nothing
 */
const lossColumn = (classes, examples, notices) => {
	/** @type {string[]} */
	const parts = [];
	if (classes > 0) {
		const plural = classes === 1 ? "class" : "classes";
		parts.push(`${classes} ${plural}! e.g. ${examples.join(", ")}`);
	}
	if (notices > 0) {
		parts.push(`${notices} legal notice${notices === 1 ? "" : "s"}!`);
	}
	return parts.length === 0 ? "-" : parts.join(", ");
};

/**
 * What a printer made of its own output: `stable` where the second pass wrote
 * the first back, and what it threw where reading its own output failed.
 * @typedef {{ stable: boolean, delta: number, error?: string }} SecondPass
 */

/** @typedef {[string, number][]} ProfileShares each file's share of the sampled time, largest first */

/** @typedef {{ code: string | undefined, second: SecondPass | undefined, wall: number, cpu: number, peak: number, profile?: ProfileShares } | { error: string, timedOut?: boolean }} Measurement */

/**
 * @typedef {object} CpuProfileNode
 * @property {number} id the node's id
 * @property {{ functionName: string, url: string }} callFrame where it ran
 */

/**
 * @typedef {object} CpuProfile
 * @property {CpuProfileNode[]} nodes every call frame sampled
 * @property {number[]} samples the node each sample landed in
 * @property {number[]} timeDeltas the microseconds before each sample
 */

// How many files `PROFILE` lists under a row.
const PROFILE_ROWS = 12;

const LIB_URL = pathToFileURL(path.join(ROOT, "lib/")).href;

/**
 * Where a sample landed, read as its file: terser's and webpack's by their path
 * in `lib`, the engine's own work (collector, compiler) by its name.
 * @param {CpuProfileNode} node a sampled frame
 * @returns {string} the bucket it counts toward
 */
const profileBucket = ({ callFrame: { functionName, url } }) => {
	const terser = url.lastIndexOf("/terser/lib/");
	if (terser !== -1) return `terser ${url.slice(terser + 12)}`;
	const webpack = url.lastIndexOf("/lib/");
	// The inspector names a file by its URL, which on Windows is not its path.
	if (webpack !== -1 && url.startsWith(LIB_URL)) {
		return `webpack ${url.slice(webpack + 5)}`;
	}
	if (functionName.startsWith("(")) return functionName;
	// Code built with `new Function` has no file of its own.
	return url === "" ? "(generated)" : "other";
};

/**
 * @param {CpuProfile} profile what the inspector sampled
 * @returns {ProfileShares} each bucket's share of the time, largest first
 */
const profileShares = (profile) => {
	/** @type {Map<number, CpuProfileNode>} */
	const byId = new Map(profile.nodes.map((node) => [node.id, node]));
	/** @type {Map<string, number>} */
	const buckets = new Map();
	let total = 0;
	for (let i = 0; i < profile.samples.length; i++) {
		const delta = profile.timeDeltas[i] || 0;
		const bucket = profileBucket(
			/** @type {CpuProfileNode} */ (byId.get(profile.samples[i]))
		);
		buckets.set(bucket, (buckets.get(bucket) || 0) + delta);
		total += delta;
	}
	return [...buckets]
		.sort((a, b) => b[1] - a[1])
		.slice(0, PROFILE_ROWS)
		.map(([bucket, time]) => [bucket, total === 0 ? 0 : time / total]);
};

/**
 * Samples the CPU while `run` runs, when `PROFILE` asks for it.
 * @param {() => Promise<void>} run the timed work
 * @returns {Promise<ProfileShares | undefined>} where the time went, if sampled
 */
const profiled = async (run) => {
	if (!process.env.PROFILE) {
		await run();
		return;
	}

	const { Session } = require("inspector");

	const session = new Session();
	session.connect();
	/**
	 * @param {string} method an inspector method
	 * @returns {Promise<EXPECTED_ANY>} what it answered
	 */
	const post = (method) =>
		new Promise((resolve, reject) => {
			session.post(method, (error, result) =>
				error ? reject(error) : resolve(result)
			);
		});
	await post("Profiler.enable");
	await post("Profiler.start");
	/** @type {CpuProfile | undefined} */
	let profile;
	let failed = false;
	/** @type {unknown} */
	let runError;
	try {
		await run();
	} catch (error) {
		failed = true;
		runError = error;
	}
	try {
		({ profile } = await post("Profiler.stop"));
	} catch (error) {
		// A failing run's own error is the one worth reporting.
		if (!failed) throw error;
	} finally {
		session.disconnect();
	}
	if (failed) throw runError;
	return profileShares(/** @type {CpuProfile} */ (profile));
};

/**
 * The lines `PROFILE` prints under a row: where its timed runs spent the CPU.
 * @param {Measurement} result one measurement
 * @returns {string} the lines, empty when nothing was sampled
 */
const formatProfile = (result) =>
	"profile" in result && result.profile !== undefined
		? result.profile
				.map(
					([bucket, share]) =>
						`${`${(share * 100).toFixed(1)}%`.padStart(12)}  ${bucket}\n`
				)
				.join("")
		: "";

// Held across the timing loop so a parse whose tree is never read cannot be
// taken for dead code.
/** @type {EXPECTED_ANY} */
let sink;

/**
 * This process's own peak resident size, in KB. `resourceUsage().maxRSS` cannot
 * answer it here: Linux carries the high-water mark across `fork`+`exec`, so a
 * spawned worker reports whatever the parent had reached.
 * @returns {number} the peak in KB, however the platform accounts for it
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
 * What a printer makes of its own output. A printer that is done printing
 * writes it back unchanged, so anything else is work a build repeats forever.
 * @param {(source: string) => EXPECTED_ANY} call the tool
 * @param {string} code what it printed
 * @returns {Promise<SecondPass>} what the second pass made of it
 */
const secondPass = async (call, code) => {
	try {
		const again = String(await call(code));
		return { stable: again === code, delta: again.length - code.length };
	} catch (error) {
		return { stable: false, delta: 0, error: thrownText(error) };
	}
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
		const profile = await profiled(async () => {
			for (let i = 0; i < 3; i++) {
				const cpuStarted = process.cpuUsage();
				const started = process.hrtime.bigint();
				sink = await call(source);
				wall = Math.min(wall, Number(process.hrtime.bigint() - started) / 1e6);
				const used = process.cpuUsage(cpuStarted);
				cpu = Math.min(cpu, (used.user + used.system) / 1e3);
			}
		});
		// A parse hands back a tree, which is measured but never reported; the two
		// printing stages must hand back the text they wrote.
		const code = stage === "parse" ? undefined : String(sink);
		report = {
			code,
			second: code === undefined ? undefined : await secondPass(call, code),
			wall,
			cpu,
			peak: peakResidentKilobytes(),
			profile
		};
	} catch (error) {
		report = { error: thrownText(error) };
	}
	process.stdout.write(JSON.stringify(report));
};

/**
 * The three cost cells, as text. A tool that works in a service process of its
 * own spends its cpu and its memory there, where nothing here can see them.
 * @param {{ wall: number, cpu: number, peak: number }} result one measurement
 * @param {boolean=} external whether the tool works out of process
 * @returns {{ wall: string, cpu: string, peak: string }} the cells
 */
const formatCost = (result, external) => ({
	wall: result.wall.toFixed(0),
	cpu: external ? "-" : result.cpu.toFixed(0),
	peak: external ? "-" : `${(result.peak / 1024).toFixed(0)} MB`
});

// A worker's whole run (load, warm-up, the timed runs and the second pass):
// one slow tool on one large input, such as `@adobe/css-tools` on Bulma, would
// otherwise hold up every table after it for many minutes.
const MEASURE_BUDGET_MS = 300000;

/**
 * @param {string} entry the calling script's path
 * @param {string} stage which table the row belongs to
 * @param {string} name the tool's name
 * @param {string} input the source to run it over
 * @param {number=} budget how long the worker may run, in milliseconds
 * @returns {Promise<Measurement>} the worker's report
 */
const measureInWorker = (
	entry,
	stage,
	name,
	input,
	budget = MEASURE_BUDGET_MS
) =>
	new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [entry, "--measure", stage, name], {
			stdio: ["pipe", "pipe", "inherit"]
		});
		/** @type {Buffer[]} */
		const chunks = [];
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill();
		}, budget);
		child.stdout.on("data", (chunk) => chunks.push(chunk));
		child.on("error", reject);
		child.on("close", (code) => {
			clearTimeout(timer);
			if (timedOut) {
				resolve({
					error: `timed out after ${budget / 1000} s`,
					timedOut: true
				});
				return;
			}
			if (code !== 0) {
				reject(new Error(`measuring ${name} exited with ${code}`));
				return;
			}
			// A tool writing to stdout of its own corrupts the payload, and parsing
			// straight into `resolve` would throw where nothing names the tool.
			const output = Buffer.concat(chunks).toString("utf8");
			try {
				resolve(JSON.parse(output));
			} catch (_error) {
				reject(
					new Error(
						`measuring ${name} wrote unreadable output: ${output.slice(0, 200)}`
					)
				);
			}
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

/**
 * The second-pass cell. A printer nothing is left to do to writes its own
 * output back, so "-" is the answer every row should carry.
 * @param {SecondPass | undefined} second what the second pass made of it
 * @returns {string} the cell
 */
const formatSecond = (second) => {
	if (second === undefined) return "-";
	if (second.error !== undefined) return "threw";
	if (second.stable) return "-";
	return second.delta === 0 ? "moved" : signed(second.delta);
};

// What a comparison cannot see, because being a few bytes off its own best is
// not being worse than another tool: an output that moves when nothing moved.

// --- Parser agreement -------------------------------------------------------

// A parse table's last column: whether each parser reads the tree the
// reference parser does. Every parser that builds a comparable tree writes
// it as a flat list of events, so two trees compare as two lists.

/** @typedef {[string, "open" | "close" | "leaf" | "text", string]} TreeEvent `[path, kind, what it says]` */

/**
 * One parse tree as what it says in document order, each event under the path
 * of the node holding it (`/html[1]/body[1]/p[2]`, XPath's numbering).
 */
class TreeEvents {
	constructor() {
		/** @type {TreeEvent[]} */
		this.list = [];
		/** @type {string[]} */
		this.paths = [""];
		// How many children of each name every open node has had so far.
		/** @type {Map<string, number>[]} */
		this.seen = [new Map()];
	}

	/**
	 * @returns {number} how many nodes are open
	 */
	get depth() {
		return this.paths.length - 1;
	}

	/**
	 * @param {string} name the node's name in the path
	 * @param {string} said what its start says
	 */
	open(name, said) {
		const seen = this.seen[this.seen.length - 1];
		const index = (seen.get(name) || 0) + 1;
		seen.set(name, index);
		const at = `${this.paths[this.paths.length - 1]}/${name}[${index}]`;
		this.paths.push(at);
		this.seen.push(new Map());
		this.list.push([at, "open", said]);
	}

	/**
	 * @param {string} said what its end says
	 */
	close(said) {
		this.list.push([/** @type {string} */ (this.paths.pop()), "close", said]);
		this.seen.pop();
	}

	/**
	 * @param {string} said a node with nothing inside it: a comment, a doctype
	 */
	leaf(said) {
		this.list.push([this.paths[this.paths.length - 1], "leaf", said]);
	}

	/**
	 * Text runs fold into one, since parsers split character data differently.
	 * @param {string} value character data
	 */
	text(value) {
		const at = this.paths[this.paths.length - 1];
		const last = this.list[this.list.length - 1];
		if (last !== undefined && last[1] === "text" && last[0] === at) {
			last[2] += value;
			return;
		}
		this.list.push([at, "text", value]);
	}
}

/**
 * @param {TreeEvent | undefined} event one event
 * @returns {string | undefined} what it says, in full
 */
const saidBy = (event) =>
	event === undefined
		? undefined
		: event[1] === "text"
			? `text ${JSON.stringify(event[2])}`
			: event[2];

/**
 * One difference as a cell, short enough to read: each side and the path are cut.
 * @param {TreeEvent | undefined} left the reference's event there, if any
 * @param {TreeEvent | undefined} right the tree's event there, if any
 * @param {string} referenceName the reference parser
 * @returns {string} the path and what each side says there
 */
const differenceCell = (left, right, referenceName) => {
	const at = /** @type {TreeEvent} */ (left || right)[0] || "/";
	// A deep path keeps its end, where the node that differs is named.
	const shown = at.length > 60 ? `…${at.slice(-59)}` : at;
	const theirs = saidBy(left);
	const ours = saidBy(right);
	// Two sides apart past the cut are both shown from just before the
	// first character they differ at, or the cell shows them the same.
	const differ =
		theirs === undefined || ours === undefined
			? 0
			: firstDifference(theirs, ours);
	const from = differ > 36 ? differ - 12 : 0;
	/**
	 * @param {string | undefined} said what one side says
	 * @returns {string} it as the cell shows it
	 */
	const show = (said) =>
		said === undefined
			? "nothing"
			: oneLine(from > 0 ? `…${said.slice(from)}` : said, 48);
	return `${shown}: ${referenceName} ${show(theirs)}, tool ${show(ours)}`;
};

// Past this many edits the trees are too far apart to align, and what is
// left of them is reported as one difference.
const EDIT_BUDGET = 500;

/**
 * Every place two trees stop saying the same thing, in document order. They are
 * aligned first (Myers' diff), so a node one side lacks is one difference.
 * @param {TreeEvents} reference the reference parser's tree
 * @param {TreeEvents} tree the tree under test
 * @param {string} referenceName the reference parser
 * @returns {string[]} each difference as a cell
 */
const treeDifferences = (reference, tree, referenceName) => {
	const theirs = reference.list;
	const ours = tree.list;
	/**
	 * @param {number} i an event of the reference's
	 * @param {number} j an event of the tree's
	 * @returns {boolean} whether both say the same
	 */
	const same = (i, j) =>
		theirs[i][1] === ours[j][1] && theirs[i][2] === ours[j][2];
	let first = 0;
	while (first < theirs.length && first < ours.length && same(first, first)) {
		first++;
	}
	let theirEnd = theirs.length;
	let ourEnd = ours.length;
	while (theirEnd > first && ourEnd > first && same(theirEnd - 1, ourEnd - 1)) {
		theirEnd--;
		ourEnd--;
	}
	const n = theirEnd - first;
	const m = ourEnd - first;
	if (n === 0 && m === 0) return [];
	const max = n + m;
	// `furthest[max + k]` is how far along the reference diagonal `k` reaches.
	const furthest = new Int32Array(2 * max + 2);
	/** @type {Int32Array[]} */
	const trace = [];
	let found = false;
	for (let d = 0; d <= Math.min(max, EDIT_BUDGET) && !found; d++) {
		trace.push(furthest.slice(max - d, max + d + 2));
		for (let k = -d; k <= d; k += 2) {
			let x =
				k === -d || (k !== d && furthest[max + k - 1] < furthest[max + k + 1])
					? furthest[max + k + 1]
					: furthest[max + k - 1] + 1;
			let y = x - k;
			while (x < n && y < m && same(first + x, first + y)) {
				x++;
				y++;
			}
			furthest[max + k] = x;
			if (x >= n && y >= m) {
				found = true;
				break;
			}
		}
	}
	if (!found) {
		return [
			`${differenceCell(theirs[first], ours[first], referenceName)}, and too many more to align`
		];
	}
	// Walk the edits back from the end, then read each run of them as one.
	/** @type {[number, number][]} */
	const kept = [];
	let x = n;
	let y = m;
	for (let d = trace.length - 1; d > 0; d--) {
		const before = trace[d];
		/**
		 * @param {number} k a diagonal
		 * @returns {number} how far it reached before this step
		 */
		const reached = (k) => before[k + d];
		const k = x - y;
		const previous =
			k === -d || (k !== d && reached(k - 1) < reached(k + 1)) ? k + 1 : k - 1;
		const previousX = reached(previous);
		const previousY = previousX - previous;
		while (x > previousX && y > previousY) {
			kept.push([--x, --y]);
		}
		x = previousX;
		y = previousY;
	}
	kept.reverse();
	kept.push([n, m]);
	/** @type {string[]} */
	const cells = [];
	let i = 0;
	let j = 0;
	/**
	 * @param {TreeEvent[]} list one side's events
	 * @param {number} from where its run of edits starts
	 * @param {number} to where it ends
	 * @returns {TreeEvent} the event naming a run only this side has
	 */
	const named = (list, from, to) => {
		// A run can start at a close it shares the shape of; name what it opens.
		for (let at = from; at < to; at++) {
			if (list[at][1] !== "close") return list[at];
		}
		return list[from];
	};
	for (const [keptX, keptY] of kept) {
		if (keptX > i && keptY > j) {
			cells.push(
				differenceCell(theirs[first + i], ours[first + j], referenceName)
			);
		} else if (keptX > i) {
			cells.push(
				differenceCell(
					named(theirs, first + i, first + keptX),
					undefined,
					referenceName
				)
			);
		} else if (keptY > j) {
			cells.push(
				differenceCell(
					undefined,
					named(ours, first + j, first + keptY),
					referenceName
				)
			);
		}
		i = keptX + 1;
		j = keptY + 1;
	}
	return cells;
};

/** @typedef {(source: string) => TreeEvents | Promise<TreeEvents>} TreeReader */

/**
 * The parse table's last column for one fixture: the reference reads it once,
 * a parser with a reader is held to it, and anything else has a tree of its own.
 * @param {string} referenceName the reference parser, which `readers` holds
 * @param {Map<string, TreeReader>} readers every parser whose tree compares
 * @param {string} source the fixture
 * @returns {(name: string) => Promise<string>} the cell for each parser
 */
const agreement = (referenceName, readers, source) => {
	/** @type {Promise<TreeEvents> | undefined} */
	let reference;
	return async (name) => {
		if (name === referenceName) return "reference";
		const read = readers.get(name);
		if (read === undefined) return "own dialect";
		reference =
			reference ||
			Promise.resolve().then(() =>
				/** @type {TreeReader} */ (readers.get(referenceName))(source)
			);
		/** @type {TreeEvents} */
		let theirs;
		try {
			theirs = await reference;
		} catch (error) {
			return `could not compare: ${referenceName} rejects it: ${thrownText(
				error
			)}`;
		}
		/** @type {TreeEvents} */
		let tree;
		try {
			tree = await read(source);
		} catch (error) {
			return `could not compare: ${thrownText(error)}`;
		}
		const said = treeDifferences(theirs, tree, referenceName);
		if (said.length === 0) return "yes";
		return said.length === 1
			? `no — ${said[0]}`
			: `no — ${said[0]} (and ${said.length - 1} more)`;
	};
};

/**
 * The `agreement` relation: webpack's parser reads every source to the tree
 * the reference does. A source the reference rejects is counted, not reported.
 * @param {object} options what to hold to what
 * @param {boolean} options.wanted whether the run asks for the relation
 * @param {string} options.referenceName the reference parser
 * @param {() => (source: string) => TreeEvents} options.reference its reader, throwing where it is not installed
 * @param {(source: string) => TreeEvents} options.tree webpack's reader
 * @param {readonly [string, string][]} options.corpus `[label, source]` for each source
 * @param {readonly Expected[]} options.expected the sweep's expectations
 * @param {string[]} options.missing what the sweep did not find, which a missing reference joins
 * @returns {{ expected: Expected[], hold: (groups: { add: (report: Report, preset: string, label: string) => void }) => void }} the expectations the run can reach, and the relation
 */
const agreementInvariant = ({
	wanted,
	referenceName,
	reference,
	tree,
	corpus,
	expected,
	missing
}) => {
	/** @type {((source: string) => TreeEvents) | undefined} */
	let read;
	if (wanted) {
		try {
			read = reference();
		} catch (_error) {
			// The reference comes with the corpus, so it is missing as a fixture is.
			missing.push(`${referenceName}, the agreement relation's reference`);
		}
	}
	return {
		expected: expected.filter(
			(entry) => read !== undefined || entry.relation !== "agreement"
		),
		hold: (groups) => {
			if (read === undefined) return;
			let rejected = 0;
			for (const [label, source] of corpus) {
				/** @type {TreeEvents} */
				let theirs;
				try {
					theirs = read(source);
				} catch (_error) {
					rejected++;
					continue;
				}
				/** @type {string[]} */
				let said;
				try {
					said = treeDifferences(theirs, tree(source), referenceName);
				} catch (error) {
					said = [`/: webpack's parser throws: ${thrownText(error)}`];
				}
				// Each difference stands alone, so one `EXPECTED` entry answers
				// for its own and never hides another later in the source.
				for (const difference of said) {
					groups.add(
						{
							relation: "agreement",
							what: `webpack's tree reads apart from ${referenceName}'s`,
							repro: `    ${difference}`
						},
						"parse",
						label
					);
				}
			}
			log(
				`held ${corpus.length - rejected} trees to ${referenceName}'s (${rejected} it rejects) …`
			);
		}
	};
};

/**
 * A finding the printer owes nothing for, with the reason it is owed nothing.
 * `relation` and `contains` together name it; `source` narrows it to the
 * fixtures where the same repro is a defect elsewhere, and `presets` to the
 * option sets it shows under, so a run narrowed past them does not ask for it.
 * @typedef {{ relation: string, contains: string, source?: string | string[], presets?: string[], why: string }} Expected
 */

/**
 * Whether a fixture is one an expectation names.
 * @param {Expected} expected the entry
 * @param {string} label the fixture
 * @returns {boolean} true when the entry has no `source` or names this one
 */
const _names = ({ source }, label) =>
	source === undefined ||
	(typeof source === "string"
		? label.includes(source)
		: source.some((one) => label.includes(one)));

/**
 * Whether one expectation covers one group.
 * @param {Expected} expected the entry
 * @param {Report} report the finding
 * @param {Set<string>} sources the fixtures it was found in
 * @returns {boolean} true when the entry names this finding
 */
const _covers = (expected, report, sources) => {
	if (expected.relation !== report.relation) return false;
	if (!report.repro.includes(expected.contains)) return false;
	// Every fixture the group reaches, not any one of them: the same repro found
	// somewhere the entry does not name is a divergence it says nothing about.
	for (const source of sources) {
		if (!_names(expected, source)) return false;
	}
	return true;
};

const RESPELLING = "respelling ";

/**
 * Whether a run asks one respelling: `RELATION` naming it or `respelling`
 * alone, and `SPELLING` naming it.
 * @param {string} name the respelling
 * @returns {boolean} true when the run asks it
 */
const wantedRespelling = (name) =>
	filterFrom("RELATION")(`${RESPELLING}${name}`) &&
	filterFrom("SPELLING")(name);

/**
 * The expectations a run can meet. One for a relation, respelling, fixture or
 * preset the run never reaches matches nothing because nothing asked it to,
 * which is not the divergence having gone away.
 * @param {readonly Expected[]} expected findings already answered for
 * @param {readonly string[]} labels the fixtures the run reads
 * @param {readonly string[]} presets the option sets the run prints under
 * @returns {Expected[]} the ones the run reaches
 */
const wantedExpectations = (expected, labels, presets) => {
	const wantedRelation = filterFrom("RELATION");
	return expected.filter(
		(entry) =>
			(entry.relation.startsWith(RESPELLING)
				? wantedRespelling(entry.relation.slice(RESPELLING.length))
				: wantedRelation(entry.relation)) &&
			labels.some((label) => _names(entry, label)) &&
			(entry.presets === undefined ||
				entry.presets.some((preset) => presets.includes(preset)))
	);
};

/**
 * Findings gathered by the repro rather than by the source: one printer defect
 * reaches hundreds of files, and is one thing to fix. An expected finding is
 * counted apart, so the number a run reports is what is left to answer for.
 * @param {readonly Expected[]=} expected findings already answered for
 * @returns {{ add: (report: Report, preset: string, label: string) => void, write: (out: (text: string) => void) => number }} the collector
 */
const findingGroups = (expected = []) => {
	/** @type {Map<string, { report: Report, presets: Set<string>, sources: Set<string> }>} */
	const groups = new Map();
	return {
		/**
		 * @param {Report} report one finding
		 * @param {string} preset which option set found it
		 * @param {string} label which source it was found in
		 */
		add(report, preset, label) {
			const key = JSON.stringify([report.relation, report.what, report.repro]);
			const group = groups.get(key);
			if (group === undefined) {
				groups.set(key, {
					report,
					presets: new Set([preset]),
					sources: new Set([label])
				});
				return;
			}
			group.presets.add(preset);
			group.sources.add(label);
		},
		/**
		 * @param {(text: string) => void} out receives the report
		 * @returns {number} how many distinct findings it named
		 */
		write(out) {
			const ordered = [...groups.values()].sort(
				(a, b) => b.sources.size - a.sources.size
			);
			/** @type {Set<Expected>} */
			const matched = new Set();
			/** @type {typeof ordered} */
			const unexpected = [];
			for (const group of ordered) {
				const covering = expected.find((entry) =>
					_covers(entry, group.report, group.sources)
				);
				if (covering === undefined) unexpected.push(group);
				else matched.add(covering);
			}
			for (const group of unexpected) {
				const { relation, what, repro } = group.report;
				const sources = [...group.sources];
				const reach =
					sources.length === 1
						? sources[0]
						: `${sources.length} sources, from ${sources[0]}`;
				out(
					`\n${relation} — ${what}\n${repro}\n    [${[...group.presets].join(
						", "
					)}] ${reach}\n`
				);
			}
			if (matched.size !== 0) {
				out(`\nexpected, and why — ${matched.size} of ${expected.length}\n`);
				for (const entry of expected) {
					if (matched.has(entry)) out(`    ${entry.relation}: ${entry.why}\n`);
				}
			}
			// An entry matching nothing is the divergence it named being gone: the
			// list has to lose it, or it stops saying anything true.
			const stale = expected.filter((entry) => !matched.has(entry));
			if (stale.length !== 0) {
				out(`\nstale — ${stale.length} expectation(s) matched nothing\n`);
				for (const entry of stale) {
					out(`    ${entry.relation}: ${entry.contains}\n`);
				}
			}
			return unexpected.length + stale.length;
		}
	};
};

/**
 * Every file of one extension below a directory, skipping the directories a
 * sweep has no business walking and the `temp-*` ones tests create and delete.
 * @param {string} dir directory to walk
 * @param {string} extension file extension including the dot
 * @param {Set<string>} skipped directory names to leave alone
 * @returns {string[]} sorted paths
 */
const collectFiles = (dir, extension, skipped) => {
	/** @type {string[]} */
	const files = [];
	/**
	 * @param {string} current directory to read
	 * @returns {void}
	 */
	const walk = (current) => {
		/** @type {fs.Dirent[] | undefined} */
		let entries;
		while (entries === undefined) {
			try {
				entries = fs.readdirSync(current, { withFileTypes: true });
			} catch (err) {
				const { code, path: missing } = /** @type {NodeJS.ErrnoException} */ (
					err
				);
				if (code !== "ENOENT" || missing === undefined) throw err;
				// A test running beside the sweep may remove a scratch directory after
				// the listing that named it, or a child this listing stats; a child gone
				// is read past by listing again, and only the root has to be there.
				if (missing === current) {
					if (current === dir) throw err;
					return;
				}
			}
		}
		for (const entry of entries) {
			if (entry.isDirectory()) {
				// A test running beside the sweep may delete its scratch one mid-walk.
				if (skipped.has(entry.name) || entry.name.startsWith("temp-")) {
					continue;
				}
				walk(path.join(current, entry.name));
			} else if (entry.name.endsWith(extension)) {
				files.push(path.join(current, entry.name));
			}
		}
	};
	walk(dir);
	return files.sort();
};

/**
 * The mode a comparison script was asked for, which is its first argument that
 * is not a modifier. `--require-corpus` says how `--invariants` ends rather
 * than what to run, so it may stand either side of it.
 * @param {readonly string[]} argv the command line, `process.argv` included
 * @returns {string | undefined} the mode, or undefined where none was given
 */
const sweepMode = (argv) =>
	argv.slice(2).find((arg) => arg !== "--require-corpus");

/**
 * What a sweep did not find, as a section of its report. A fixture the install
 * did not land is coverage lost with nothing to read it off, so it is named
 * rather than swept past — a finding has already lived in exactly the fixtures
 * a bare checkout does not hold.
 * @param {readonly string[]} missing the labels the sweep looked for and did not find
 * @returns {string} the section, or `""` when the corpus was whole
 */
const missingReport = (missing) =>
	missing.length === 0
		? ""
		: `\nnot built — ${missing.length}\n${missing
				.map((label) => `    ${label}\n`)
				.join("")}`;

/**
 * The exit code a sweep ends on. `--require-corpus` is for the check that gates
 * on the whole of it: a run without the installed fixtures sweeps what it has,
 * which is what a contributor wants and what a gate must not accept.
 * @param {number} found how many findings the sweep named
 * @param {readonly string[]} missing the fixtures it did not find
 * @param {readonly string[]} argv the command line to read the flag off
 * @returns {number} 0 where the sweep may pass, 1 otherwise
 */
const sweepExitCode = (found, missing, argv) =>
	found > 0 || (argv.includes("--require-corpus") && missing.length !== 0)
		? 1
		: 0;

module.exports = {
	STAGES,
	TreeEvents,
	agreement,
	agreementInvariant,
	collectFiles,
	compress,
	cutsAt,
	exists,
	filterFrom,
	findingGroups,
	firstDifference,
	formatCost,
	formatProfile,
	formatSecond,
	hasher,
	idempotence,
	installPackages,
	kb,
	legalNotices,
	loaderFor,
	log,
	lossColumn,
	measure,
	measureInWorker,
	missingReport,
	oneLine,
	pathSpanWalk,
	profileShares,
	purityRelation,
	run,
	shrink,
	signed,
	sliceRelation,
	spans,
	sweepExitCode,
	sweepMode,
	thrownText,
	treeDifferences,
	wantedExpectations,
	wantedRespelling
};
