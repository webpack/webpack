/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Counts the modules a fresh process loads for each way webpack is used, and
// fails when a module outside webpack loads one of its internal files rather
// than being handed it. With `--base`, renders the counts against another checkout.
//
//   node tooling/check-module-loading.js                                 # check
//   node tooling/check-module-loading.js --base <dir> --output <file.md> # report

const { fork } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");

/** @typedef {{ webpack: number, dependencies: number, outsideLoads: string[] }} ScenarioResult */

/**
 * @param {string} name the option's name, without `--`
 * @returns {string | undefined} the value after it on the command line
 */
const argument = (name) => {
	const index = process.argv.indexOf(`--${name}`);
	return index === -1 ? undefined : process.argv[index + 1];
};

const ROOT = path.resolve(argument("root") || path.join(__dirname, ".."));
const INDEX = path.join(ROOT, "lib/index.js");

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

	const index = pathToFileURL(INDEX).href;
	const nodeModules =
		fs.realpathSync(path.join(ROOT, "node_modules")) + path.sep;

	// Every requester counts, not only the first: Node adds an already loaded
	// module to each later requester's `module.children` too.
	/** @type {Map<string, Set<string>>} */
	const parents = new Map();
	/** @type {Set<string>} */
	const loaded = new Set();
	registerHooks({
		resolve(specifier, context, nextResolve) {
			// The checkout being measured, not wherever `yarn link` points.
			const result =
				specifier === "webpack"
					? { url: index, format: "commonjs", shortCircuit: true }
					: nextResolve(specifier, context);
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
		if (file.startsWith(nodeModules)) {
			result.dependencies++;
			continue;
		}
		if (!file.startsWith(ROOT + path.sep) || file === __filename) continue;
		result.webpack++;
		if (file === INDEX) continue;
		for (const parentUrl of parents.get(url) || []) {
			if (parentUrl === self || !parentUrl.startsWith("file:")) continue;
			const parent = fs.realpathSync(fileURLToPath(parentUrl));
			if (
				parent.startsWith(nodeModules) ||
				!parent.startsWith(ROOT + path.sep)
			) {
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
 * @param {string} root the checkout to load webpack from
 * @returns {Promise<ScenarioResult>} what a fresh process running it loaded
 */
const measure = (name, root) =>
	new Promise((resolve, reject) => {
		/** @type {ScenarioResult | undefined} */
		let result;
		const child = fork(__filename, ["--scenario", name, "--root", root], {
			stdio: "inherit"
		});
		child.on("message", (message) => {
			result = /** @type {ScenarioResult} */ (message);
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0 && result) return resolve(result);
			reject(new Error(`scenario "${name}" exited with code ${code}`));
		});
	});

/**
 * @param {number} head the count on this checkout
 * @param {number | undefined} base the count on the base checkout
 * @returns {string} the change, marked red when it grew and green when it shrank
 */
const change = (head, base) => {
	if (base === undefined || head === base) return "—";
	return head > base ? `🔴 +${head - base}` : `🟢 −${base - head}`;
};

const main = async () => {
	if (typeof require("module").registerHooks !== "function") {
		console.log(
			`Skipped: module.registerHooks needs Node.js 22.15 or newer (running ${process.version}).`
		);
		return;
	}
	const baseRoot = argument("base");
	const output = argument("output");
	/** @type {string[]} */
	const rows = [];
	/** @type {string[]} */
	const outsideLoads = [];
	for (const name of Object.keys(SCENARIOS)) {
		const head = await measure(name, ROOT);
		/** @type {ScenarioResult | undefined} */
		let base;
		if (baseRoot) {
			// A scenario the base cannot run yet (a minifier it lacks) has no count.
			base = await measure(name, path.resolve(baseRoot)).catch(() => undefined);
		}
		rows.push(
			base
				? `| ${name} | ${base.webpack} → ${head.webpack} | ${change(
						head.webpack,
						base.webpack
					)} | ${base.dependencies} → ${head.dependencies} | ${change(
						head.dependencies,
						base.dependencies
					)} |`
				: `| ${name} | ${head.webpack} | — | ${head.dependencies} | — |`
		);
		for (const load of head.outsideLoads) outsideLoads.push(`${name}: ${load}`);
	}
	const report = [
		"## Module loading",
		"",
		baseRoot
			? "Modules a fresh process loads for each way webpack is used, base → head. Every module loaded is startup time, so fewer is better."
			: "Modules a fresh process loads for each way webpack is used. Every module loaded is startup time, so fewer is better.",
		"",
		"| Scenario | webpack files | Change | dependency files | Change |",
		"| :-- | --: | --: | --: | --: |",
		...rows,
		"",
		...(outsideLoads.length > 0
			? [
					"🔴 **A package outside webpack loads webpack's own files.** Hand it a function, not a path:",
					"",
					...outsideLoads.map((load) => `- \`${load}\``),
					""
				]
			: [])
	].join("\n");
	if (output) fs.writeFileSync(output, report);
	console.log(report);
	if (outsideLoads.length > 0 && !output) process.exitCode = 1;
};

if (argument("scenario") === undefined) {
	main().catch((err) => {
		console.error(err);
		process.exitCode = 1;
	});
} else {
	runScenario(/** @type {string} */ (argument("scenario"))).catch((err) => {
		console.error(err);
		process.exitCode = 1;
	});
}
