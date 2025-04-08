const fs = require("fs");
const path = require("path");
const runBenchmark = require("../test/helpers/runBenchmark");

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

	const baselinePath = path.join(resultsDir, "baseline.json");
	const currentResults = {};
	const regressions = [];

	let baseline = {};
	if (fs.existsSync(baselinePath)) {
		baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
	}

	for (const testCase of testCases) {
		const configPath = path.join(casesDir, testCase, "webpack.config.js");
		const config = require(configPath);
		const result = await runBenchmark(config, path.join(casesDir, testCase));
		currentResults[testCase] = result;

		if (baseline[testCase]) {
			const prev = baseline[testCase];
			if (result.mean > prev.mean * 1.1) {
				regressions.push({
					testCase,
					prev: prev.mean.toFixed(4),
					curr: result.mean.toFixed(4)
				});
			}
		}
	}

	fs.writeFileSync(
		path.join(resultsDir, "benchmark.json"),
		JSON.stringify(currentResults, null, 2)
	);

	console.log("Benchmarking complete. Output saved to /benchmark-results");

	if (regressions.length) {
		console.warn("\nPotential regressions detected:");
		for (const r of regressions) {
			console.warn(`- ${r.testCase}: ${r.prev} → ${r.curr}`);
		}
	} else {
		console.log("No regressions detected.");
	}

	// Save current as baseline if not already there
	if (!fs.existsSync(baselinePath)) {
		fs.writeFileSync(baselinePath, JSON.stringify(currentResults, null, 2));
		console.log("Saved current results as baseline.");
	}
})();
