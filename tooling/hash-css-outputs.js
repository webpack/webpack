/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Fingerprint everything webpack's CSS printer emits over the whole CSS corpus,
// so two checkouts can be shown to print byte for byte the same.

//   node tooling/hash-css-outputs.js [--repo <checkout>] > hashes.json

// For every stylesheet `compare-css-tools.js` installs and every tracked
// `test/**/*.css`, it hashes the minified code, source map, warnings and errors
// under each preset below, and the beautified code and map. `--repo` loads
// `lib/` from another checkout over this one's corpus; `diff` the two outputs.

const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const Module = require("module");
const path = require("path");
const {
	CACHE,
	GENERATED_FIXTURES,
	INSTALLED_FIXTURES,
	PACKED_FIXTURES
} = require("./compare-css-tools");

/** @typedef {import("../lib/css/cssMinify")} CssMinify */
/** @typedef {NonNullable<Parameters<CssMinify>[2]>} CssMinifyOptions */

const ROOT = path.resolve(__dirname, "..");

const MODERN = { browsers: ["chrome 120", "firefox 120", "safari 17"] };

/** @type {[string, CssMinifyOptions][]} */
const PRESETS = [
	["default", {}],
	["target", { environment: MODERN }],
	["vars", { environment: MODERN, rewriteCustomProperties: true }],
	[
		"legacy",
		{ environment: { browsers: ["chrome 100", "firefox 100", "safari 15.4"] } }
	],
	[
		"all",
		{
			environment: MODERN,
			mergeDistantRules: true,
			dropOverriddenDeclarations: true,
			convertApproximateColors: true,
			convertLengthUnits: true,
			rewriteCustomProperties: true
		}
	]
];

/**
 * @returns {[string, string][]} `[label, file]` for every stylesheet hashed
 */
const corpus = () => {
	const tracked = execFileSync("git", ["ls-files", "test/**/*.css"], {
		cwd: ROOT,
		encoding: "utf8"
	})
		.split("\n")
		.filter(Boolean);
	return [
		.../** @type {[string, string][]} */ (
			INSTALLED_FIXTURES.map(([label, file]) => [
				label,
				path.join(CACHE, "node_modules", file)
			])
		),
		...[...GENERATED_FIXTURES, ...PACKED_FIXTURES].map(
			([label, file]) =>
				/** @type {[string, string]} */ ([label, path.join(CACHE, file)])
		),
		...tracked.map(
			(file) => /** @type {[string, string]} */ ([file, path.join(ROOT, file)])
		)
	];
};

/**
 * @param {string} text what was printed, joined into one string
 * @returns {string} a short digest of it
 */
const digest = (text) =>
	crypto.createHash("sha1").update(text).digest("hex").slice(0, 12);

/**
 * @param {(Error | string)[] | undefined} list the diagnostics a minify reported
 * @returns {string[]} each one as text, since an `Error` stringifies to `{}`
 */
const diagnostics = (list) => (list || []).map(String);

/**
 * Hashes every stylesheet under every preset, and prints the map as JSON with
 * one entry per line, so `diff` names each output that moved.
 * @param {string} repo the checkout whose `lib/` prints
 * @returns {Promise<void>}
 */
const main = async (repo) => {
	const entry = path.join(repo, "lib/index.js");
	// WHY: `cssMinify` reads the parser through `require("webpack")`, which must
	// land in the checkout under test, linked or not.
	const resolve = /** @type {EXPECTED_ANY} */ (Module)._resolveFilename;
	/** @type {EXPECTED_ANY} */ (Module)._resolveFilename =
		function _resolveFilename(
			/** @type {string} */ request,
			/** @type {EXPECTED_ANY[]} */ ...rest
		) {
			return request === "webpack"
				? entry
				: resolve.call(this, request, ...rest);
		};

	/** @type {CssMinify} */
	const cssMinify = require(path.join(repo, "lib/css/cssMinify.js"));

	/** @type {typeof import("../lib/css/syntax")} */
	const { SourceProcessor } = require(path.join(repo, "lib/css/syntax.js"));

	const files = corpus();
	const missing = files.filter(([, file]) => !fs.existsSync(file));
	if (missing.length > 0) {
		throw new Error(
			`${missing.length} fixtures are missing (first: ${missing[0][1]}); run \`yarn benchmark:css-tools:setup\``
		);
	}

	/** @type {Record<string, string>} */
	const hashes = {};
	for (const [label, file] of files) {
		const css = fs.readFileSync(file, "utf8");
		for (const [preset, options] of PRESETS) {
			try {
				const { code, map, warnings, errors } = await cssMinify(
					{ "a.css": css },
					undefined,
					options
				);
				hashes[`${label} | ${preset}`] = digest(
					`${code}\0${JSON.stringify(map || null)}\0${JSON.stringify(
						diagnostics(warnings)
					)}\0${JSON.stringify(diagnostics(errors))}`
				);
			} catch (error) {
				hashes[`${label} | ${preset}`] = `throws ${String(error)}`;
			}
		}
		try {
			const { code, map } = new SourceProcessor().process(css, {
				mode: "beautify",
				source: "a.css"
			});
			hashes[`${label} | beautify`] = digest(
				`${code}\0${JSON.stringify(map || null)}`
			);
		} catch (error) {
			hashes[`${label} | beautify`] = `throws ${String(error)}`;
		}
	}
	process.stdout.write(`${JSON.stringify(hashes, null, "\t")}\n`);
};

const repoAt = process.argv.indexOf("--repo");
main(repoAt === -1 ? ROOT : path.resolve(process.argv[repoAt + 1])).catch(
	(error) => {
		process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
		process.exitCode = 1;
	}
);
