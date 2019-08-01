const LogTestPlugin = require("../../helpers/LogTestPlugin");

module.exports = {
	mode: "production",
	entry: "./index",
	stats: "detailed",
	infrastructureLogging: {
		level: "log"
	},
	plugins: [new LogTestPlugin()]
};
