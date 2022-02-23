const { describeCases } = require("./ConfigTestCases.template");

describeCases({
	name: "ConfigParallelismTestCases",
	parallelism: 1
});
