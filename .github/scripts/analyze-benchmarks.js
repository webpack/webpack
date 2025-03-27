const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const REGRESSION_THRESHOLD = 0.05; // 5% regression threshold
const SIGNIFICANT_CHANGE_THRESHOLD = 0.02; // 2% is considered a significant change

// Run benchmarks
console.log("🏃 Running benchmarks...");
try {
	execSync("yarn benchmark", { stdio: "inherit" });
} catch (err) {
	throw new Error(`❌ Error running benchmarks: ${err.message}`);
}

/**
 * Parses benchmark results from a file.
 * @param {string} filePath Path to the benchmark results file.
 * @returns {object} Parsed benchmark results.
 */
function parseBenchmarkResults(filePath) {
	if (!fs.existsSync(filePath)) {
		console.error(`⚠️ Benchmark file not found: ${filePath}`);
		return {};
	}

	const content = fs.readFileSync(filePath, "utf8").trim();
	if (!content) {
		console.error(`⚠️ Benchmark file is empty: ${filePath}`);
		return {};
	}

	const lines = content.split("\n");
	const results = {};

	for (const line of lines) {
		const parts = line.split("\t").map(s => s.trim());
		if (parts.length < 3) {
			console.warn(`⚠️ Skipping invalid line: ${line}`);
			continue;
		}

		const [name, min, max] = parts;
		const minVal = Number.parseFloat(min);
		const maxVal = Number.parseFloat(max);

		if (Number.isNaN(minVal) || Number.isNaN(maxVal)) {
			console.warn(`⚠️ Skipping malformed values: ${line}`);
			continue;
		}

		results[name] = {
			min: minVal,
			max: maxVal,
			mean: (minVal + maxVal) / 2
		};
	}

	return results;
}

/**
 * Combines multiple benchmark result files into a single dataset.
 * @param {string} directory Path to the directory containing benchmark files.
 * @returns {object} Aggregated benchmark results.
 */
function aggregateBenchmarkResults(directory) {
	const files = fs.readdirSync(directory).filter(file => file.endsWith(".txt"));
	const aggregatedResults = {};

	for (const file of files) {
		const filePath = path.join(directory, file);
		const results = parseBenchmarkResults(filePath);

		for (const [name, data] of Object.entries(results)) {
			if (!aggregatedResults[name]) {
				aggregatedResults[name] = { min: [], max: [], mean: [] };
			}
			aggregatedResults[name].min.push(data.min);
			aggregatedResults[name].max.push(data.max);
			aggregatedResults[name].mean.push(data.mean);
		}
	}

	// Compute average across all benchmark files
	for (const [name, values] of Object.entries(aggregatedResults)) {
		const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
		aggregatedResults[name] = {
			min: avg(values.min),
			max: avg(values.max),
			mean: avg(values.mean)
		};
	}

	return aggregatedResults;
}

/**
 * Compares benchmark results to detect regressions and improvements.
 * @param {object} baseResults Baseline benchmark results.
 * @param {object} prResults PR benchmark results.
 * @returns {object} Comparison results.
 */
function compareResults(baseResults, prResults) {
	const comparison = {
		regressions: [],
		improvements: [],
		unchanged: [],
		hasRegression: false
	};

	for (const [testName, prResult] of Object.entries(prResults)) {
		const baseResult = baseResults[testName];
		if (!baseResult) continue;

		const changePct = (prResult.mean - baseResult.mean) / baseResult.mean;

		const result = {
			name: testName,
			baseMean: baseResult.mean,
			prMean: prResult.mean,
			changePercent: changePct * 100
		};

		if (changePct > REGRESSION_THRESHOLD) {
			comparison.regressions.push(result);
			comparison.hasRegression = true;
		} else if (changePct < -SIGNIFICANT_CHANGE_THRESHOLD) {
			comparison.improvements.push(result);
		} else {
			comparison.unchanged.push(result);
		}
	}

	return comparison;
}

/**
 * Generates a performance analysis report.
 * @param {object} comparison Comparison results from benchmarks.
 * @returns {object} Report with summary and details.
 */
function generateReport(comparison) {
	let summary = "";
	let details = "";

	if (comparison.hasRegression) {
		summary =
			"🔴 Performance regressions detected that exceed the threshold of 5%.\n";
	} else if (comparison.improvements.length > 0) {
		summary = "🟢 Performance improvements detected!\n";
	} else {
		summary = "🟡 No significant performance changes detected.\n";
	}

	if (comparison.regressions.length > 0) {
		details += "### Regressions\n\n";
		details += "| Test | Base (ms) | PR (ms) | Change |\n";
		details += "|------|-----------|---------|--------|\n";
		for (const r of comparison.regressions) {
			details += `| ${r.name} | ${r.baseMean.toFixed(2)} | ${r.prMean.toFixed(2)} | +${r.changePercent.toFixed(2)}% |\n`;
		}
		details += "\n";
	}

	if (comparison.improvements.length > 0) {
		details += "### Improvements\n\n";
		details += "| Test | Base (ms) | PR (ms) | Change |\n";
		details += "|------|-----------|---------|--------|\n";
		for (const r of comparison.improvements) {
			details += `| ${r.name} | ${r.baseMean.toFixed(2)} | ${r.prMean.toFixed(2)} | ${r.changePercent.toFixed(2)}% |\n`;
		}
		details += "\n";
	}

	return {
		hasRegression: comparison.hasRegression,
		summary,
		details
	};
}

// Aggregate benchmark results
const baseResults = aggregateBenchmarkResults("benchmark-results/base");
const prResults = aggregateBenchmarkResults("benchmark-results/pr");

// Check if benchmark results are available
if (
	Object.keys(baseResults).length === 0 ||
	Object.keys(prResults).length === 0
) {
	throw new Error(
		"❌ Error: One or both benchmark result directories are empty."
	);
}

const comparison = compareResults(baseResults, prResults);
const report = generateReport(comparison);

// Write analysis results
fs.writeFileSync(
	path.join("benchmark-results", "analysis.json"),
	JSON.stringify(report, null, 2)
);

// Fail CI if there is a performance regression
if (comparison.hasRegression) {
	throw new Error("❌ Performance regression detected! Failing the CI.");
} else {
	console.log("✅ No significant regressions detected.");
}
