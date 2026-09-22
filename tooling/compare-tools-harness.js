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
const { createHash } = require("crypto");
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

// The exit code a run ends on when the tree as committed is what is wrong,
// rather than the network — 78, the conventional one for a bad configuration.

// `tooling/retry.js` reads it as "this will fail the same way next time".
const CONFIGURATION_EXIT_CODE = 78;

/**
 * A failure whose message is the whole report, either because it was written
 * for a reader or because the command it names already wrote its own. Printed
 * as that message rather than as a stack into this file, which names nothing
 * anybody can act on.
 * @param {string} message what to print, and nothing else
 * @param {number} code the exit code to end on
 * @returns {Error} the error to throw
 */
const fatal = (message, code) =>
	Object.assign(new Error(message), { fatalExit: code });

/**
 * End a run on what was thrown: the message alone where the message is the
 * report, and the stack where it is a defect in this code.
 * @param {EXPECTED_ANY} error what was thrown
 * @returns {void}
 */
const fail = (error) => {
	const code = error === null ? undefined : error && error.fatalExit;
	if (typeof code === "number") {
		log(error.message);
		process.exitCode = code;
		return;
	}
	log(String(error && error.stack ? error.stack : error));
	process.exitCode = 1;
};

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
			// The command wrote its own diagnosis to this process's stderr, so the
			// four frames it took to get here are four lines that say nothing.
			else reject(fatal(`${command} exited with ${code}`, 1));
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
 * One package the manifest and the lockfile do not agree on. `undefined` on
 * either side is the package being absent from it altogether.
 * @typedef {{ name: string, asked: string | undefined, locked: string | undefined }} Drift
 */

/**
 * Where a corpus's two files disagree, which is the same question `npm ci` asks
 * before it installs anything. Asked here so it can be answered in the handful
 * of lines a reader needs: npm answers it with every affected package — the
 * transitive ones included, which is hundreds — followed by its own usage text,
 * and the one thing to do about it appears nowhere in either.
 * @param {EXPECTED_ANY} manifest the parsed package.json
 * @param {EXPECTED_ANY} lock the parsed package-lock.json
 * @returns {Drift[]} one entry per package they disagree on, manifest order
 */
const corpusDrift = (manifest, lock) => {
	const asked = (manifest && manifest.dependencies) || {};
	const packages = (lock && lock.packages) || {};
	// A lockfile keeps the manifest's own dependency list beside the tree it
	// resolved to, and `npm ci` holds both to it.
	const root = (packages[""] && packages[""].dependencies) || {};
	/** @type {Drift[]} */
	const drift = [];
	for (const [name, wanted] of Object.entries(asked)) {
		const installed = packages[`node_modules/${name}`];
		// The version the tree carries where it carries one, since that is what an
		// install would actually put on disk; the recorded range otherwise.
		const locked =
			installed && installed.version ? installed.version : root[name];
		if (locked !== wanted || root[name] !== wanted) {
			drift.push({ name, asked: wanted, locked });
		}
	}
	for (const name of Object.keys(root)) {
		if (asked[name] === undefined) {
			drift.push({ name, asked: undefined, locked: root[name] });
		}
	}
	return drift;
};

// Enough to recognize what moved without the list becoming the wall of text it
// replaces; the command below prints the rest.
const DRIFT_SHOWN = 10;

/**
 * What to print when a corpus cannot be installed because its two files
 * disagree: which corpus, which packages, and the one command that fixes it.
 * @param {string} name the corpus directory name
 * @param {readonly Drift[]} drift what the two files disagree on
 * @returns {string} the report, ready to print
 */
const driftMessage = (name, drift) => {
	const directory = `tooling/comparison/${name}`;
	const shown = drift.slice(0, DRIFT_SHOWN);
	const width = Math.max(...shown.map((entry) => entry.name.length));
	const rows = shown
		.map(
			(entry) =>
				`    ${entry.name.padEnd(width)}  package.json ${
					entry.asked === undefined ? "(absent)" : entry.asked
				}, lockfile ${entry.locked === undefined ? "(absent)" : entry.locked}\n`
		)
		.join("");
	const rest =
		drift.length > shown.length
			? `    … and ${drift.length - shown.length} more\n`
			: "";
	const packages = `${drift.length} package${drift.length === 1 ? "" : "s"}`;
	return `${directory}/package.json and package-lock.json disagree, so the corpus cannot be installed.

${packages} the two name differently:
${rows}${rest}
To fix it, regenerate the lockfile and commit it with the manifest:

    cd ${directory} && npm install --package-lock-only

This is not a flaky download: running the job again fails the same way until the lockfile is regenerated.`;
};

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
	/** @type {Buffer[]} */
	const declared = [];
	for (const file of MANIFEST_FILES) {
		const content = await fs.promises.readFile(path.join(source, file));
		declared.push(content);
		identity.update(content);
		identity.update("\0");
	}
	const wanted = identity.digest("hex");
	const installed =
		(await exists(modules)) && (await exists(stamp))
			? await fs.promises.readFile(stamp, "utf8")
			: undefined;
	if (installed === wanted) return cache;
	// Before the install rather than after it fails: `npm ci` refuses a manifest
	// and a lockfile that disagree, and what it refuses with is not a report.
	const drift = corpusDrift(
		JSON.parse(declared[0].toString("utf8")),
		JSON.parse(declared[1].toString("utf8"))
	);
	if (drift.length !== 0) {
		throw fatal(driftMessage(name, drift), CONFIGURATION_EXIT_CODE);
	}
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

/** @typedef {{ code: string | undefined, second: SecondPass | undefined, wall: number, cpu: number, peak: number } | { error: string }} Measurement */

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
 * @param {EXPECTED_ANY} error what a tool threw, which can be any value
 * @returns {string} the first line of what it says
 */
const thrownText = (error) => {
	const said =
		error && /** @type {Error} */ (error).message
			? /** @type {Error} */ (error).message
			: error;
	return String(said).split("\n", 1)[0];
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
		report = {
			code,
			second: code === undefined ? undefined : await secondPass(call, code),
			wall,
			cpu,
			peak: peakResidentKilobytes()
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

/**
 * A finding: which relation broke, what it did, and the smallest input found
 * that shows it.
 * @typedef {{ relation: string, what: string, repro: string }} Report
 */

/**
 * @param {number} delta a byte difference
 * @returns {string} it signed
 */
const signed = (delta) => `${delta > 0 ? "+" : ""}${delta} B`;

/**
 * @param {string} text any text
 * @param {number} limit how much of it to keep
 * @returns {string} it on one line, cut to the limit
 */
const oneLine = (text, limit) => {
	let shown = "";
	for (const character of text) {
		const code = /** @type {number} */ (character.codePointAt(0));
		// Tab, LF, FF and CR are left to the whitespace collapse below; every
		// other control character is shown, since holding one is some findings.
		shown +=
			code > 0x1f ||
			code === 0x9 ||
			code === 0xa ||
			code === 0xc ||
			code === 0xd
				? character
				: `\\x${code.toString(16).padStart(2, "0")}`;
	}
	const flat = shown.replace(/\s+/g, " ").trim();
	return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
};

/**
 * @param {string} before one text
 * @param {string} after another
 * @returns {number} the first index they differ at
 */
const firstDifference = (before, after) => {
	const shortest = Math.min(before.length, after.length);
	for (let i = 0; i < shortest; i++) {
		if (before.charCodeAt(i) !== after.charCodeAt(i)) return i;
	}
	return shortest;
};

// Each bisection step prints the whole source twice, so a page carrying
// thousands of sites stops shrinking rather than holding up the report.
const SHRINK_BUDGET = 40;

/**
 * Bisect a finding down to the sites that carry it. Where neither half keeps it
 * the sites interact, and what is left stands as the report's repro.
 * @template S
 * @template {{ kind: string }} F
 * @param {(sites: S[]) => F | null} holds whether a subset still shows it
 * @param {S[]} sites every mutated site
 * @param {string} kind the kind to keep
 * @returns {S[]} the smallest subset found
 */
const shrink = (holds, sites, kind) => {
	let current = sites;
	let budget = SHRINK_BUDGET;
	while (current.length > 1 && budget > 0) {
		const half = Math.ceil(current.length / 2);
		const left = current.slice(0, half);
		const right = current.slice(half);
		budget -= 2;
		const keptLeft = holds(left);
		if (keptLeft !== null && keptLeft.kind === kind) {
			current = left;
			continue;
		}
		const keptRight = holds(right);
		if (keptRight !== null && keptRight.kind === kind) {
			current = right;
			continue;
		}
		break;
	}
	return current;
};

/**
 * Whether printing an already-printed source changes it. A printer that is done
 * is done, so a second pass that moves is work every build repeats.
 * @param {object} options what to hold to the relation
 * @param {(source: string) => string} options.minify the printer under test
 * @param {string} options.source the input
 * @param {(text: string) => string} options.says what a text says, as a digest
 * @param {((printed: string, at: number) => { source: string, again: string } | null)=} options.repro cuts the difference down to what reproduces it
 * @returns {{ printed: string | null, reports: Report[] }} what it printed, and what moved
 */
const idempotence = ({ minify, source, says, repro }) => {
	/** @type {string} */
	let printed;
	try {
		printed = minify(source);
	} catch (error) {
		return {
			printed: null,
			reports: [
				{ relation: "minify", what: "threw", repro: `    ${thrownText(error)}` }
			]
		};
	}
	/** @type {string} */
	let again;
	try {
		again = minify(printed);
	} catch (error) {
		// A printer that reads its own output back and throws is the strongest
		// finding there is, so it is reported rather than ending the sweep.
		return {
			printed,
			reports: [
				{
					relation: "idempotence",
					what: "threw",
					repro: `    ${thrownText(error)}`
				}
			]
		};
	}
	if (again === printed) return { printed, reports: [] };
	const kind = says(again) === says(printed) ? "bytes" : "differs";
	const at = firstDifference(printed, again);
	const cut = repro === undefined ? null : repro(printed, at);
	return {
		printed,
		reports: [
			{
				relation: "idempotence",
				what: `${kind}, ${signed(again.length - printed.length)}`,
				repro:
					cut === null
						? `    ${oneLine(printed.slice(at, at + 70), 70)}\n      -> ${oneLine(again.slice(at, at + 70), 70)}`
						: `    ${oneLine(cut.source, 80)}\n      -> ${oneLine(cut.again, 80)}`
			}
		]
	};
};

/**
 * A finding the printer owes nothing for, with the reason it is owed nothing.
 * `relation` and `contains` together name it; `source` narrows it to one
 * fixture where the same repro is a defect elsewhere.
 * @typedef {{ relation: string, contains: string, source?: string, why: string }} Expected
 */

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
	if (expected.source === undefined) return true;
	// Every fixture the group reaches, not any one of them: the same repro found
	// somewhere the entry does not name is a divergence it says nothing about.
	for (const source of sources) {
		if (!source.includes(expected.source)) return false;
	}
	return true;
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
 * sweep has no business walking.
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
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (skipped.has(entry.name)) continue;
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

/**
 * Why a gated sweep ended the way it did, in the words a reader needs. The
 * count alone cannot say it: a run that found nothing and swept an incomplete
 * corpus still fails, so "0 findings" is the last line above a red job and the
 * report reads as contradicting itself.
 * @param {number} found how many findings the sweep named
 * @param {readonly string[]} missing the fixtures it did not find
 * @param {readonly string[]} argv the command line to read the flag off
 * @param {string} setup the command that builds the corpus
 * @returns {string} the verdict, ready to print
 */
const sweepVerdict = (found, missing, argv, setup) => {
	/** @type {string[]} */
	const lines = [];
	if (found > 0) {
		lines.push(
			`FAILED: ${found} finding${found === 1 ? "" : "s"} above to answer for.`
		);
	}
	const one = missing.length === 1;
	const fixtures = `${missing.length} fixture${one ? "" : "s"} ${
		one ? "was" : "were"
	} never built`;
	if (argv.includes("--require-corpus") && missing.length !== 0) {
		lines.push(
			`FAILED: ${fixtures}, so this sweep never read ${
				one ? "it" : "them"
			} — ${one ? "the one" : "the ones"} listed under "not built" above.`,
			"This run was given --require-corpus, which passes only on the whole corpus: a finding has already lived in exactly the fixtures a bare checkout does not hold.",
			`Build ${one ? "it" : "them"} with \`${setup}\`, then run this again.`
		);
	}
	if (lines.length === 0) {
		lines.push(
			missing.length === 0
				? "PASSED: no findings, and every fixture was swept."
				: `PASSED: no findings. ${fixtures} and so ${
						one ? "was" : "were"
					} not swept — pass --require-corpus to make that a failure.`
		);
	}
	return `\n${lines.join("\n")}\n`;
};

module.exports = {
	CONFIGURATION_EXIT_CODE,
	STAGES,
	collectFiles,
	compress,
	corpusDrift,
	driftMessage,
	exists,
	fail,
	fatal,
	filterFrom,
	findingGroups,
	firstDifference,
	formatCost,
	formatSecond,
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
	run,
	shrink,
	signed,
	sweepExitCode,
	sweepMode,
	sweepVerdict,
	thrownText
};
