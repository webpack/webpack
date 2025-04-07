// scripts/runBenchmarkCI.js

const fs = require("fs");
const path = require("path");
const runBenchmark = require("../test/helpers/runBenchmark"); // we'll modularize it

(async () => {
	const resultsDir = path.resolve(__dirname, "../benchmark-results");
	fs.mkdirSync(resultsDir, { recursive: true });

	const casesDir = path.resolve(__dirname, "../test/benchmarkCases");
	const testCases = fs
		.readdirSync(casesDir)
		.filter(
			caseName =>
				!caseName.startsWith("_") &&
				fs.existsSync(path.join(casesDir, caseName, "webpack.config.js"))
		);

	const resultJSON = {};

	for (const testCase of testCases) {
		const configPath = path.join(casesDir, testCase, "webpack.config.js");
		const config = require(configPath);
		const result = await runBenchmark(config, path.join(casesDir, testCase));
		resultJSON[testCase] = result;
	}

	fs.writeFileSync(
		path.join(resultsDir, "benchmark.json"),
		JSON.stringify(resultJSON, null, 2)
	);

	console.log("Benchmarking complete. Output saved to /benchmark-results");
})();
