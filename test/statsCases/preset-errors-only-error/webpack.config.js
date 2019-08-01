const LogTestPlugin = require("../../helpers/LogTestPlugin");

module.exports = {
	mode: "production",
	entry: "./index",
	stats: "errors-only",
	infrastructureLogging: {
		level: "error"
	},
	plugins: [new LogTestPlugin()]
};
