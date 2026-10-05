"use strict";

const stripVTControlCharacters = require("./stripVTControlCharacters");

module.exports = (
	/** @type {NodeJS.WriteStream} */ stdio,
	/** @type {boolean=} */ tty
) => {
	/** @type {string[]} */
	let logs = [];

	const write = stdio.write;
	const isTTY = stdio.isTTY;

	stdio.write = /** @type {NodeJS.WriteStream["write"]} */ (
		function write(/** @type {string} */ str) {
			logs.push(str);
			return true;
		}
	);
	if (tty !== undefined) stdio.isTTY = tty;

	return {
		data: logs,

		reset: () => (logs = []),

		toString: () =>
			stripVTControlCharacters(logs.join(""))
				.replace(
					/\([^)]+\) (\[[^\]]+\]\s*)?(Deprecation|Experimental)Warning.+(\n\(Use .node.+\))?(\n(\s|BREAKING CHANGE).*)*(\n\s+at .*)*\n?/g,
					""
				)
				// Ignore deprecated `import * as pkg from "file.json" assert { type: "json" };`
				.replace(
					/\([^)]+\) (\[[^\]]+\]\s*)?(V8:).* 'assert' is deprecated in import statements and support will be removed in a future version; use 'with' instead\n/g,
					""
				)
				// Babel's note on instrumenting a source over 500KB for coverage, written
				// on its first require (a cold jest cache) by whichever case runs then
				.replace(
					/\[BABEL\] Note: The code generator has .+ as it exceeds the max of .+\n/g,
					""
				),

		toStringRaw: () => logs.join(""),

		restore() {
			stdio.write = write;
			stdio.isTTY = isTTY;

			delete require.cache[require.resolve("../../")];
			delete require.cache[
				require.resolve("../../lib/node/NodeEnvironmentPlugin")
			];
			delete require.cache[require.resolve("../../lib/node/nodeConsole")];
		}
	};
};
