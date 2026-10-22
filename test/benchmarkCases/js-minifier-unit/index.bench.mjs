import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const jsMinify = require("../../../lib/javascript/jsMinify.js");

const source = fs.readFileSync(require.resolve("lodash/lodash.js"), "utf8");

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	// Includes compression and output: token-table savings must survive the
	// whole minifier, including the AST and source buffers it also needs.
	bench.add('unit benchmark "js-minifier-unit", lodash', async () => {
		await jsMinify(
			{ "lodash.js": source },
			undefined,
			{ compress: { passes: 2 } },
			true
		);
	});
};
