"use strict";

const stripVTControlCharacters = require("strip-ansi");

module.exports = (stdio, tty) => {
	let logs = [];

	const write = stdio.write;
	const isTTY = stdio.isTTY;

	stdio.write = function write(str) {
		logs.push(str);
	};
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
