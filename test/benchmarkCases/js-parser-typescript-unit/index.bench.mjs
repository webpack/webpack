import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/javascript/JavascriptParser")} */
const JavascriptParser = require("../../../lib/javascript/JavascriptParser.js");

const source = fs.readFileSync(
	require.resolve("typescript/lib/typescript.js"),
	"utf8"
);

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	bench.add('unit benchmark "js-parser-typescript-unit"', () => {
		const parser = new JavascriptParser("auto");
		parser.parse(source, {});
	});
};
