const LogTestPlugin = require("../../helpers/LogTestPlugin");

module.exports = {
	mode: "production",
	entry: "./index",
	stats: "minimal",
	plugins: [new LogTestPlugin()]
};
