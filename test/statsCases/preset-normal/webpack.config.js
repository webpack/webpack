const LogTestPlugin = require("../../helpers/LogTestPlugin");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: "normal",
	plugins: [new LogTestPlugin()]
};
