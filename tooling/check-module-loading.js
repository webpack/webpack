/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Counts the modules a fresh process loads for each way webpack is used, and
// fails when a count grows past `module-loading.json` or a module outside
// webpack loads one of its internal files rather than being handed it.
//
//   node tooling/check-module-loading.js          # check
//   node tooling/check-module-loading.js --write  # rewrite the baseline

const { fork } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const INDEX = path.join(ROOT, "lib/index.js");
const NODE_MODULES = path.join(ROOT, "node_modules") + path.sep;
const BASELINE = path.join(__dirname, "module-loading.json");

/** @typedef {{ webpack: number, dependencies: number }} Counts */
/** @typedef {Counts & { outsideLoads: string[] }} ScenarioResult */

/**
 * @param {string} name a minifier's path under `lib/`
 * @param {string} file the asset's filename
 * @param {string} code the asset's source
 * @returns {() => Promise<void>} a scenario running that minifier once
 */
const minify = (name, file, code) => async () => {
	await require(path.join(ROOT, "lib", name))({ [file]: code });
};

/**
 * @returns {Promise<void>} resolves once a production build of JavaScript, CSS
 * and HTML with the default minimizers has finished
 */
const build = async () => {
	const context = fs.mkdtempSync(path.join(os.tmpdir(), "webpack-loading-"));
	fs.writeFileSync(
		path.join(context, "index.html"),
		'<!doctype html><link rel="stylesheet" href="./style.css"><script src="./index.js"></script>'
	);
	fs.writeFileSync(path.join(context, "style.css"), "body { color: red; }");
	fs.writeFileSync(path.join(context, "index.js"), "console.log(1 + 1);");

	const webpack = require(INDEX);

	try {
		await new Promise((resolve, reject) => {
			webpack(
				{
					mode: "production",
					context,
					entry: "./index.html",
					output: { path: path.join(context, "dist") },
					experiments: { css: true, html: true }
				},
				/**
				 * @param {Error | null} err a fatal error
				 * @param {import("../lib/stats/Stats") | undefined} stats the build's stats
				 * @returns {void}
				 */
				(err, stats) => {
					if (err) return reject(err);
					if (stats && stats.hasErrors()) {
						return reject(new Error(stats.toString("errors-only")));
					}
					resolve(undefined);
				}
			);
		});
	} finally {
		fs.rmSync(context, { recursive: true, force: true });
	}
};

/** @type {Record<string, () => Promise<void>>} */
const SCENARIOS = {
	'require("webpack")': async () => {
		require(INDEX);
	},
	'import "webpack"': async () => {
		await import(pathToFileURL(INDEX).href);
	},
	"javascript minify": minify(
		"javascript/jsMinify",
		"a.js",
		"function add(a, b) { return a + b; } console.log(add(1, 2));"
	),
	"css minify": minify("css/cssMinify", "a.css", "a { color: #ff0000; }"),
	"html minify": minify(
		"html/htmlMinify",
		"a.html",
		"<!doctype html><p class=' a '>text</p><style>a { color: red }</style>"
	),
	"xml minify": minify(
		"html/xmlMinify",
		"a.svg",
		'<svg xmlns="http://www.w3.org/2000/svg"> <g/> </svg>'
	),
	"json minify": minify("json/jsonMinify", "a.json", '{ "a": [1, 2] }'),
	"production build": build
};

/**
 * Runs one scenario in this process, recording every module it loads and every
 * module that asked for it, then reports to the parent process.
 * @param {string} name the scenario
 * @returns {Promise<void>} resolves once the result has been sent
 */
const runScenario = async (name) => {
	const { registerHooks } = require("module");

	// Every requester counts, not only the first: Node adds an already loaded
	// module to each later requester's `module.children` too.
	/** @type {Map<string, Set<string>>} */
	const parents = new Map();
	/** @type {Set<string>} */
	const loaded = new Set();
	registerHooks({
		resolve(specifier, context, nextResolve) {
			const result = nextResolve(specifier, context);
			if (context.parentURL) {
				const set = parents.get(result.url);
				if (set) set.add(context.parentURL);
				else parents.set(result.url, new Set([context.parentURL]));
			}
			return result;
		},
		load(url, context, nextLoad) {
			loaded.add(url);
			return nextLoad(url, context);
		}
	});
	await SCENARIOS[name]();
	const self = pathToFileURL(__filename).href;
	/** @type {ScenarioResult} */
	const result = { webpack: 0, dependencies: 0, outsideLoads: [] };
	for (const url of loaded) {
		if (!url.startsWith("file:")) continue;
		const file = fs.realpathSync(fileURLToPath(url));
		if (file.startsWith(NODE_MODULES)) {
			result.dependencies++;
			continue;
		}
		if (!file.startsWith(ROOT + path.sep) || file === __filename) continue;
		result.webpack++;
		if (file === INDEX) continue;
		for (const parentUrl of parents.get(url) || []) {
			if (parentUrl === self || !parentUrl.startsWith("file:")) continue;
			const parent = fs.realpathSync(fileURLToPath(parentUrl));
			if (parent.startsWith(NODE_MODULES) || !parent.startsWith(ROOT)) {
				result.outsideLoads.push(
					`${path.relative(ROOT, parent)} -> ${path.relative(ROOT, file)}`
				);
			}
		}
	}
	/** @type {NonNullable<typeof process.send>} */ (process.send)(result);
};

/**
 * @param {string} name the scenario
 * @returns {Promise<ScenarioResult>} what a fresh process running it loaded
 */
const measure = (name) =>
	new Promise((resolve, reject) => {
		/** @type {ScenarioResult | undefined} */
		let result;
		const child = fork(__filename, ["--scenario", name], { stdio: "inherit" });
		child.on("message", (message) => {
			result = /** @type {ScenarioResult} */ (message);
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0 && result) return resolve(result);
			reject(new Error(`scenario "${name}" exited with code ${code}`));
		});
	});

const main = async () => {
	if (typeof require("module").registerHooks !== "function") {
		console.log(
			`Skipped: module.registerHooks needs Node.js 22.15 or newer (running ${process.version}).`
		);
		return;
	}
	const write = process.argv.includes("--write");
	/** @type {Record<string, Counts>} */
	const baseline = fs.existsSync(BASELINE)
		? JSON.parse(fs.readFileSync(BASELINE, "utf8"))
		: {};
	/** @type {Record<string, Counts>} */
	const next = {};
	/** @type {string[]} */
	const failures = [];
	/** @type {string[]} */
	const rows = [];
	for (const name of Object.keys(SCENARIOS)) {
		const { webpack, dependencies, outsideLoads } = await measure(name);
		next[name] = { webpack, dependencies };
		const before = baseline[name] || { webpack: 0, dependencies: 0 };
		rows.push(
			`| ${name} | ${webpack} | ${before.webpack} | ${dependencies} | ${before.dependencies} |`
		);
		for (const load of outsideLoads) {
			failures.push(
				`${name}: a module outside webpack loads an internal file: ${load}`
			);
		}
		if (!write) {
			for (const key of /** @type {(keyof Counts)[]} */ ([
				"webpack",
				"dependencies"
			])) {
				if (next[name][key] > before[key]) {
					failures.push(
						`${name}: loads ${next[name][key]} ${key} modules, over its baseline of ${before[key]}`
					);
				}
			}
		}
	}
	console.log(
		"| Scenario | webpack files | baseline | dependency files | baseline |"
	);
	console.log("| :-- | --: | --: | --: | --: |");
	for (const row of rows) console.log(row);
	if (write) {
		fs.writeFileSync(BASELINE, `${JSON.stringify(next, null, 2)}\n`);
		console.log(`Wrote ${path.relative(ROOT, BASELINE)}`);
	}
	if (failures.length > 0) {
		console.error(`\n${failures.join("\n")}`);
		console.error(
			"\nLoad a module only where it is used, and hand other packages functions rather than paths to webpack's files; if the growth is intended, run with --write."
		);
		process.exitCode = 1;
	}
};

const scenarioIndex = process.argv.indexOf("--scenario");
if (scenarioIndex === -1) {
	main().catch((err) => {
		console.error(err);
		process.exitCode = 1;
	});
} else {
	runScenario(process.argv[scenarioIndex + 1]).catch((err) => {
		console.error(err);
		process.exitCode = 1;
	});
}
