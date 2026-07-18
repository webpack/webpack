import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/javascript/JavascriptParser")} */
const JavascriptParser = require("../../../lib/javascript/JavascriptParser.js");
const { WebpackParser } = require("../../../lib/javascript/syntax.js");

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
const threeEsmPath = fileURLToPath(import.meta.resolve("three"));
const threeEsmSource = fs.readFileSync(threeEsmPath, "utf8");
const threeEsmMinSource = fs.readFileSync(
	threeEsmPath.replace(/\.js$/, ".min.js"),
	"utf8"
);
// Popular libraries also shipped as devDependencies.
const reactSource = readPkgFile("react", "cjs/react.development.js");
const reactDomSource = readPkgFile("react-dom", "cjs/react-dom.development.js");
const lodashSource = readPkgFile("lodash", "lodash.js");
const lodashEsSource = readPkgFile("lodash-es", "lodash.js");

// Tokenize-only: drive WebpackParser's owned tokenizer to EOF, no AST/walk.
/**
 * @param {string} code source code
 * @param {"module" | "script"} sourceType source type
 * @returns {number} token count (kept so the loop isn't elided)
 */
const tokenizeJs = (code, sourceType) => {
	let n = 0;
	for (const _tok of WebpackParser.tokenizer(code, {
		ecmaVersion: "latest",
		sourceType,
		allowHashBang: true
	})) {
		n++;
	}
	return n;
};

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	// ---- parse: all source types over the TypeScript source ----
	bench.add("unit benchmark \"js-parser-unit\", sourceType 'auto'", () => {
		new JavascriptParser("auto").parse(typescriptSource, {});
	});
	bench.add("unit benchmark \"js-parser-unit\", sourceType 'module'", () => {
		new JavascriptParser("module").parse(typescriptSource, {});
	});
	bench.add("unit benchmark \"js-parser-unit\", sourceType 'script'", () => {
		new JavascriptParser("script").parse(typescriptSource, {});
	});

	// acorn only, no walk; same options as parse() to isolate walker changes
	bench.add("unit benchmark \"js-parser-unit\", mode 'parse'", () => {
		JavascriptParser._parse(typescriptSource, {
			sourceType: "auto",
			locations: true,
			ranges: true,
			comments: true,
			semicolons: true,
			importPhases: false
		});
	});

	// ---- parse: popular sources ----
	bench.add(
		"unit benchmark \"js-parser-unit\", source 'three.module.js'",
		() => {
			new JavascriptParser("module").parse(threeEsmSource, {});
		}
	);
	bench.add(
		"unit benchmark \"js-parser-unit\", source 'three.module.min.js'",
		() => {
			new JavascriptParser("module").parse(threeEsmMinSource, {});
		}
	);
	bench.add(
		"unit benchmark \"js-parser-unit\", source 'react.development.js'",
		() => {
			new JavascriptParser("auto").parse(reactSource, {});
		}
	);
	bench.add(
		"unit benchmark \"js-parser-unit\", source 'react-dom.development.js'",
		() => {
			new JavascriptParser("auto").parse(reactDomSource, {});
		}
	);
	bench.add("unit benchmark \"js-parser-unit\", source 'lodash.js'", () => {
		new JavascriptParser("auto").parse(lodashSource, {});
	});
	bench.add("unit benchmark \"js-parser-unit\", source 'lodash-es'", () => {
		new JavascriptParser("module").parse(lodashEsSource, {});
	});

	// ---- tokenizer only (WebpackParser tokenizer); min vs non-min shows the
	// cost of tokenizing whitespace, mirroring the css/html tokenizer benches ----
	bench.add("unit benchmark \"js-parser-unit\", tokenize typescript", () => {
		tokenizeJs(typescriptSource, "module");
	});
	bench.add(
		"unit benchmark \"js-parser-unit\", tokenize three.module.js",
		() => {
			tokenizeJs(threeEsmSource, "module");
		}
	);
	bench.add(
		"unit benchmark \"js-parser-unit\", tokenize three.module.min.js",
		() => {
			tokenizeJs(threeEsmMinSource, "module");
		}
	);
};
