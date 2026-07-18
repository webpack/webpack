import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/javascript/JavascriptParser")} */
const JavascriptParser = require("../../../lib/javascript/JavascriptParser.js");

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

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	// auto mode
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", sourceType 'auto'",
		() => {
			const parser = new JavascriptParser("auto");
			parser.parse(typescriptSource, {});
		}
	);

	// forced ecma module mode, strict parse, no fallback
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", sourceType 'module'",
		() => {
			const parser = new JavascriptParser("module");
			parser.parse(typescriptSource, {});
		}
	);

	// forced classic script mode
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", sourceType 'script'",
		() => {
			const parser = new JavascriptParser("script");
			parser.parse(typescriptSource, {});
		}
	);

	// acorn only, no walk; same options as parse() to isolate walker changes
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", mode 'parse'",
		() => {
			JavascriptParser._parse(typescriptSource, {
				sourceType: "auto",
				locations: true,
				ranges: true,
				comments: true,
				semicolons: true,
				importPhases: false
			});
		}
	);

	// large ESM, exercises harmony import/export paths
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", source 'three.module.js'",
		() => {
			const parser = new JavascriptParser("module");
			parser.parse(threeEsmSource, {});
		}
	);

	// minified ESM, stresses short identifiers and single-line source
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", source 'three.module.min.js'",
		() => {
			const parser = new JavascriptParser("module");
			parser.parse(threeEsmMinSource, {});
		}
	);

	// react (CommonJS UMD dev build)
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", source 'react.development.js'",
		() => {
			const parser = new JavascriptParser("auto");
			parser.parse(reactSource, {});
		}
	);

	// large react-dom (CommonJS UMD dev build)
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", source 'react-dom.development.js'",
		() => {
			const parser = new JavascriptParser("auto");
			parser.parse(reactDomSource, {});
		}
	);

	// lodash (large single-file CommonJS build)
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", source 'lodash.js'",
		() => {
			const parser = new JavascriptParser("auto");
			parser.parse(lodashSource, {});
		}
	);

	// lodash-es (large single-file ESM build)
	bench.add(
		"unit benchmark \"js-parser-typescript-unit\", source 'lodash-es'",
		() => {
			const parser = new JavascriptParser("module");
			parser.parse(lodashEsSource, {});
		}
	);
};
