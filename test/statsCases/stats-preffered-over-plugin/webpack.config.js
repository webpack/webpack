const TestPlugin = require("./TestPlugin");
module.exports = {
	mode: "development",
	entry: "./index",
	stats: {
		preset: "none",
		timings: true
	},
	plugins: [new TestPlugin()]
};
