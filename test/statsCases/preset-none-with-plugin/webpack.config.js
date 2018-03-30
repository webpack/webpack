const TestPlugin = require("./TestPlugin");
module.exports = {
	mode: "development",
	entry: "./index",
	stats: "none",
	plugins: [new TestPlugin()]
};
