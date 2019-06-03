const stripAnsi = require("strip-ansi");

module.exports = {
	Stdio: {
		capture(stdio) {
			const logs = [];

			const write = stdio.write;

			stdio.write = function(str) {
				logs.push(str);

				write.apply(this, arguments);
			};

			return {
				data: logs,

				toString: () => {
					return logs.map(v => stripAnsi(v)).join("");
				},

				toStringRaw: () => {
					logs.join("");
				},

				restore() {
					stdio.write = write;
				}
			};
		}
	},

	RunCompilerAsync: compiler =>
		new Promise((resolve, reject) => {
			compiler.run(err => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		})
};
