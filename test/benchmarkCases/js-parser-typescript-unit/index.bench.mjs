import fs from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/javascript/JavascriptParser")} */
const JavascriptParser = require("../../../lib/javascript/JavascriptParser.js");

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
		"unit benchmark \"js-parser-typescript-unit\", mode 'parse-only'",
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
};
