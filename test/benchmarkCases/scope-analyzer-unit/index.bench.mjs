import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

const JavascriptParser = require("../../../lib/javascript/JavascriptParser.js");
const analyzeScope = require("../../../lib/javascript/ScopeAnalyzer.js");

/** @type {typeof import("../../../lib/javascript/JavascriptParser")} */

// Read a file that ships inside a package, resolved via the package's
// package.json so an `exports` map can't block a deep path (fs bypasses it).
/**
 * @param {string} pkg package name
 * @param {string} rel path within the package
 * @returns {string} file contents
 */
const readPkgFile = (pkg, rel) =>
	fs.readFileSync(
		path.join(path.dirname(require.resolve(`${pkg}/package.json`)), rel),
		"utf8"
	);

const typescriptSource = fs.readFileSync(
	require.resolve("typescript/lib/typescript.js"),
	"utf8"
);
// "three" import condition resolves to build/three.module.js
const threeEsmSource = fs.readFileSync(
	fileURLToPath(import.meta.resolve("three")),
	"utf8"
);
const lodashSource = readPkgFile("lodash", "lodash.js");

/**
 * @param {string} code source code
 * @param {"auto" | "module" | "script"} sourceType source type
 * @returns {EXPECTED_ANY} the parsed program
 */
const parse = (code, sourceType) =>
	JavascriptParser._parse(code, {
		sourceType,
		ranges: true,
		importPhases: false
	}).ast;

const typescriptAst = parse(typescriptSource, "auto");
const threeEsmAst = parse(threeEsmSource, "module");
const lodashAst = parse(lodashSource, "auto");

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	// ---- scope analysis over a pre-parsed AST ----
	// The regression gate for analyzer changes: no parse noise.
	bench.add(
		"unit benchmark \"scope-analyzer-unit\", analyze 'typescript.js'",
		() => {
			analyzeScope(typescriptAst);
		}
	);
	bench.add(
		"unit benchmark \"scope-analyzer-unit\", analyze 'three.module.js'",
		() => {
			analyzeScope(threeEsmAst);
		}
	);
	bench.add(
		"unit benchmark \"scope-analyzer-unit\", analyze 'lodash.js'",
		() => {
			analyzeScope(lodashAst);
		}
	);

	// ---- parse only, for the parse-vs-analyze split ----
	bench.add(
		"unit benchmark \"scope-analyzer-unit\", parse 'typescript.js'",
		() => {
			parse(typescriptSource, "auto");
		}
	);
	bench.add(
		"unit benchmark \"scope-analyzer-unit\", parse 'three.module.js'",
		() => {
			parse(threeEsmSource, "module");
		}
	);
	bench.add("unit benchmark \"scope-analyzer-unit\", parse 'lodash.js'", () => {
		parse(lodashSource, "auto");
	});

	// ---- end to end, the shape the concatenation path actually pays ----
	bench.add(
		"unit benchmark \"scope-analyzer-unit\", parse+analyze 'typescript.js'",
		() => {
			analyzeScope(parse(typescriptSource, "auto"));
		}
	);
	bench.add(
		"unit benchmark \"scope-analyzer-unit\", parse+analyze 'three.module.js'",
		() => {
			analyzeScope(parse(threeEsmSource, "module"));
		}
	);
	bench.add(
		"unit benchmark \"scope-analyzer-unit\", parse+analyze 'lodash.js'",
		() => {
			analyzeScope(parse(lodashSource, "auto"));
		}
	);
};
