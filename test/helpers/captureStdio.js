const stripAnsi = require("strip-ansi");

module.exports = stdio => {
	let logs = [];

	const write = stdio.write;

	stdio.write = function(str) {
		logs.push(str);

		write.apply(this, arguments);
	};

	return {
		data: logs,

		reset: () => (logs = []),

		toString: () => {
			return logs.map(v => stripAnsi(v)).join("");
		},

		toStringRaw: () => {
			return logs.join("");
		},

		restore() {
			stdio.write = write;
		}
	};
};
