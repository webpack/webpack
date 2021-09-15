const stripAnsi = require("strip-ansi");

module.exports = (stdio, tty) => {
	let logs = [];

	const write = stdio.write;
	const isTTY = stdio.isTTY;

	stdio.write = function (str) {
		logs.push(str);
	};
	if (tty !== undefined) stdio.isTTY = tty;

	return {
		data: logs,

		reset: () => (logs = []),

		toString: () => {
			return stripAnsi(logs.join("")).replace(
				/\([^)]+\) (\[[^\]]+\]\s*)?(Deprecation|Experimental)Warning.+(\n\(Use .node.+\))?(\n(\s|BREAKING CHANGE).*)*(\n\s+at .*)*\n?/g,
				""
			);
		},

		toStringRaw: () => {
			return logs.join("");
		},

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
