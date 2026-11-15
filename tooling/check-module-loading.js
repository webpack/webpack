/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Counts the files a fresh process loads for each way webpack is used, and fails
// when a webpack file another package loads reaches `lib/index.js`. With
// `--base`, renders the counts against another checkout.
//
//   node tooling/check-module-loading.js                                 # check
//   node tooling/check-module-loading.js --base <dir> --output <file.md> # report

const { fork } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");

/** @typedef {{ requester: string, file: string, reached: number, reachesIndex: boolean }} OutsideLoad */
/** @typedef {{ webpack: string[], packages: string[], outsideLoads: OutsideLoad[] }} ScenarioResult */

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
 * @param {string} context the directory to write the project into
 * @returns {void}
 */
const writeProject = (context) => {
	fs.writeFileSync(
		path.join(context, "index.html"),
		'<!doctype html><link rel="stylesheet" href="./style.css"><script src="./index.js"></script>'
	);
	fs.writeFileSync(path.join(context, "style.css"), "body { color: red; }");
	fs.writeFileSync(path.join(context, "index.js"), "console.log(1 + 1);");
};

/**
 * @param {"production" | "development"} mode the build's mode
 * @param {boolean} watch whether to watch with hot module replacement, then
 * rebuild once after an edit
 * @returns {() => Promise<void>} a scenario building JavaScript, CSS and HTML
 */
const build = (mode, watch) => async () => {
	const context = fs.mkdtempSync(path.join(os.tmpdir(), "webpack-loading-"));
	writeProject(context);

	/** @type {typeof import("../lib/index")} */
	const webpack = require(INDEX);

	const compiler = webpack({
		mode,
		context,
		entry: "./index.html",
		output: { path: path.join(context, "dist") },
		experiments: { css: true, html: true },
		plugins: watch ? [new webpack.HotModuleReplacementPlugin()] : []
	});

	try {
		await new Promise((resolve, reject) => {
			let builds = 0;
			/**
			 * @param {Error | null} err a fatal error
			 * @param {import("../lib/stats/Stats") | undefined} stats the build's stats
			 * @returns {void}
			 */
			const done = (err, stats) => {
				if (err) return reject(err);
				if (stats && stats.hasErrors()) {
					return reject(new Error(stats.toString("errors-only")));
				}
				// The edit lands after the first build, so the rebuild is a hot update.
				if (watch && ++builds === 1) {
					return fs.writeFileSync(
						path.join(context, "index.js"),
						"console.log(2 + 2);"
					);
				}
				compiler.close(() => resolve(undefined));
			};

			if (watch) compiler.watch({ aggregateTimeout: 50 }, done);
			else compiler.run(done);
		});
	} finally {
		fs.rmSync(context, { recursive: true, force: true });
	}
};

/**
 * @returns {typeof import("../lib/index")} webpack, loaded through its public entry
 */
const webpack = () => require(INDEX);

// Using one language's syntax or minifier must not start the compiler: what
// these load is what a tool parsing or printing that language pays.
/** @type {Record<string, () => Promise<void>>} */
const LANGUAGE_SCENARIOS = {
	"JavaScript syntax": async () => {
		new (webpack().javascript.syntax.SourceProcessor)().process(
			"function add(a, b) { return a + b; }",
			{ mode: "beautify" }
		);
	},
	"CSS syntax": async () => {
		new (webpack().css.syntax.SourceProcessor)().process("a { color: red; }", {
			mode: "beautify"
		});
	},
	"HTML syntax": async () => {
		new (webpack().html.syntax.SourceProcessor)().process(
			"<!doctype html><p>text</p>",
			{ mode: "beautify" }
		);
	},
	"XML syntax": async () => {
		new (webpack().html.syntax.SourceProcessor)().process(
			'<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>',
			{ mode: "beautify", xml: true }
		);
	},
	"JavaScript minifier": minify(
		"javascript/jsMinify",
		"a.js",
		"function add(a, b) { return a + b; } console.log(add(1, 2));"
	),
	"CSS minifier": minify("css/cssMinify", "a.css", "a { color: #ff0000; }"),
	"HTML minifier": minify(
		"html/htmlMinify",
		"a.html",
		"<!doctype html><p class=' a '>text</p><style>a { color: red }</style>"
	),
	"XML minifier": minify(
		"html/xmlMinify",
		"a.svg",
		'<svg xmlns="http://www.w3.org/2000/svg"> <g/> </svg>'
	),
	"JSON minifier": minify("json/jsonMinify", "a.json", '{ "a": [1, 2] }')
};

/** @type {Record<string, () => Promise<void>>} */
const SCENARIOS = {
	'`require("webpack")`': async () => {
		webpack();
	},
	'`import "webpack"`': async () => {
		await import(pathToFileURL(INDEX).href);
	},
	...LANGUAGE_SCENARIOS,
	"development build": build("development", false),
	"production build": build("production", false),
	"watch with HMR, one rebuild": build("development", true)
};

/**
 * Runs one scenario in this process, recording every file it loads and every
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
	const children = new Map();
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
				const set = children.get(context.parentURL);
				if (set) set.add(result.url);
				else children.set(context.parentURL, new Set([result.url]));
			}
			return result;
		},
		load(url, context, nextLoad) {
			loaded.add(url);
			return nextLoad(url, context);
		}
	});
	await SCENARIOS[name]();

	/**
	 * @param {string} url a loaded module
	 * @returns {string | undefined} its real path, for a file
	 */
	const toFile = (url) =>
		url.startsWith("file:") ? fs.realpathSync(fileURLToPath(url)) : undefined;
	/**
	 * @param {string | undefined} file a real path
	 * @returns {boolean} whether it is webpack's own, not this script
	 */
	const isWebpack = (file) =>
		file !== undefined &&
		file.startsWith(ROOT + path.sep) &&
		!file.startsWith(nodeModules) &&
		file !== __filename;

	/** @type {ScenarioResult} */
	const result = { webpack: [], packages: [], outsideLoads: [] };
	for (const url of loaded) {
		const file = toFile(url);
		if (file === undefined) continue;
		if (file.startsWith(nodeModules)) {
			result.packages.push(file.slice(nodeModules.length));
		} else if (isWebpack(file)) {
			result.webpack.push(path.relative(ROOT, file));
		}
	}
	const self = pathToFileURL(__filename).href;
	for (const [parentUrl, set] of children) {
		const parent = toFile(parentUrl);
		if (parentUrl === self || parent === undefined || isWebpack(parent)) {
			continue;
		}
		for (const url of set) {
			const file = toFile(url);
			if (!isWebpack(file) || url === index) continue;
			// What the walk through `module.children` reaches from here, as the
			// persistent cache's build dependencies do.
			const reached = new Set([url]);
			for (const next of reached) {
				for (const child of children.get(next) || []) {
					if (isWebpack(toFile(child))) reached.add(child);
				}
			}
			result.outsideLoads.push({
				requester: path.relative(ROOT, parent),
				file: path.relative(ROOT, /** @type {string} */ (file)),
				reached: reached.size,
				reachesIndex: reached.has(index)
			});
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
 * @returns {string} the count, with how much it grew (red) or shrank (green)
 */
const count = (head, base) => {
	if (base === undefined || head === base) return `${head}`;
	return head > base
		? `${head} (🔴 +${head - base})`
		: `${head} (🟢 −${base - head})`;
};

/**
 * @param {string[]} head the files this checkout loads
 * @param {string[]} base the files the base checkout loads
 * @returns {string[]} one line per file loaded on one side only, at most 20 each way
 */
const changedFiles = (head, base) => {
	const before = new Set(base);
	const after = new Set(head);
	const added = head.filter((file) => !before.has(file)).sort();
	const removed = base.filter((file) => !after.has(file)).sort();
	return [
		...added.slice(0, 20).map((file) => `+ ${file}`),
		...(added.length > 20 ? [`+ … ${added.length - 20} more`] : []),
		...removed.slice(0, 20).map((file) => `- ${file}`),
		...(removed.length > 20 ? [`- … ${removed.length - 20} more`] : [])
	];
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
	const changes = [];
	/** @type {Map<string, OutsideLoad & { scenarios: string[] }>} */
	const outsideLoads = new Map();
	/** @type {string[]} */
	const compilerLoads = [];
	for (const name of Object.keys(SCENARIOS)) {
		const head = await measure(name, ROOT);
		/** @type {ScenarioResult | undefined} */
		let base;
		if (baseRoot) {
			// A scenario the base cannot run yet (a minifier it lacks) has no count.
			base = await measure(name, path.resolve(baseRoot)).catch(() => undefined);
		}
		const webpack = head.webpack.length;
		const packages = head.packages.length;
		if (base) {
			rows.push(
				`| ${name} | ${count(webpack, base.webpack.length)} | ${count(
					packages,
					base.packages.length
				)} |`
			);
			const lines = [
				...changedFiles(head.webpack, base.webpack),
				...changedFiles(head.packages, base.packages).map(
					(line) => `${line.slice(0, 2)}node_modules/${line.slice(2)}`
				)
			];
			if (lines.length > 0) {
				changes.push(`**${name}**`, "", "```diff", ...lines, "```", "");
			}
		} else {
			rows.push(`| ${name} | ${webpack} | ${packages} |`);
		}
		if (
			name in LANGUAGE_SCENARIOS &&
			head.webpack.includes(path.join("lib", "Compiler.js"))
		) {
			compilerLoads.push(name);
		}
		for (const load of head.outsideLoads) {
			const key = `${load.requester}\n${load.file}`;
			const seen = outsideLoads.get(key);
			if (seen) seen.scenarios.push(name);
			else outsideLoads.set(key, { ...load, scenarios: [name] });
		}
	}
	const failures = [...outsideLoads.values()].filter(
		(load) => load.reachesIndex
	);

	const report = [
		"## Module loading",
		"",
		`How many files a fresh Node.js process loads (\`require\` or \`import\`) to do each thing below${baseRoot ? "; a change from the pull request's base is marked 🔴 when it grew and 🟢 when it shrank" : ""}. Every file is startup time, so fewer is better. **webpack files** are this package's own (\`lib/\`, \`hot/\`); **\`node_modules\` files** are its dependencies'.`,
		"",
		"| What the process does | webpack files | `node_modules` files |",
		"| :-- | --: | --: |",
		...rows,
		"",
		...compilerLoads.map(
			(name) =>
				`🔴 **${name} loads \`lib/Compiler.js\`**: a language's syntax or minifier must not start webpack's compiler.\n`
		),
		...(changes.length > 0
			? [
					"<details><summary>Files behind the changes</summary>",
					"",
					...changes,
					"</details>",
					""
				]
			: []),
		...(outsideLoads.size > 0
			? [
					"### webpack files other packages load",
					"",
					"A file another package loads hangs under that package, so anything that walks `module.children` from it — like the persistent cache's build dependencies — follows what it requires. It must not reach `lib/index.js`, which brings every module webpack has loaded.",
					"",
					"| Loaded by | webpack file | webpack files it brings | In |",
					"| :-- | :-- | --: | :-- |",
					...[...outsideLoads.values()].map(
						(load) =>
							`| \`${load.requester}\` | \`${load.file}\` | ${load.reachesIndex ? `🔴 ${load.reached}, \`lib/index.js\` among them` : load.reached} | ${load.scenarios.join(", ")} |`
					),
					""
				]
			: [])
	].join("\n");
	if (output) fs.writeFileSync(output, report);
	console.log(report);
	if (failures.length > 0) {
		console.error(
			"A file another package loads reaches `lib/index.js`: hand that package a function, not a path to webpack's file."
		);
	}
	if ((failures.length > 0 || compilerLoads.length > 0) && !output) {
		process.exitCode = 1;
	}
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
