const LogTestPlugin = require("../../helpers/LogTestPlugin");

module.exports = {
	mode: "production",
	entry: "./index",
	stats: "errors-only",
	plugins: [new LogTestPlugin()]
};
