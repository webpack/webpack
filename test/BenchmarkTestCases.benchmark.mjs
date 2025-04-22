"use strict";

import path from "path";
import fs from "fs/promises";
import { createWriteStream, constants } from "fs";
import Benchmark from "benchmark";
import { remove } from "./helpers/remove";
import { dirname } from "path";
import { fileURLToPath } from "url";
import simpleGit from "simple-git";
// eslint-disable-next-line n/no-extraneous-import
import { jest } from "@jest/globals";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");
const git = simpleGit(rootPath);

const REV_LIST_REGEXP = /^([a-f0-9]+)\s*([a-f0-9]+)\s*([a-f0-9]+)?\s*$/;

new Error().cause = 1;

/**
 * @param {(string | undefined)[]} revList rev list
 * @returns {Promise<string>} head
 */
async function getHead(revList) {
	if (typeof process.env.HEAD !== "undefined") {
		return process.env.HEAD;
	}

	if (revList[3]) {
		return revList[3];
	}

	return revList[1];
}

/**
 * @param {(string | undefined)[]} revList rev list
 * @returns {Promise<string>} base
 */
async function getBase(revList) {
	if (typeof process.env.BASE !== "undefined") {
		return process.env.BASE;
	}

	if (revList[3]) {
		return revList[2];
	}

	const branchName = await git.raw(["rev-parse", "--abbrev-ref", "HEAD"]);

	if (branchName.trim() !== "main") {
		const resultParents = await git.raw([
			"rev-list",
			"--parents",
			"-n",
			"1",
			"main"
		]);

		const revList = REV_LIST_REGEXP.exec(resultParents);

		if (!revList[1]) {
			throw new Error("No parent commit found");
		}

		return revList[1];
	}

	return revList[2];
}

/**
 * @returns {Promise<{name: string, rev: string}[]>} baseline revs
 */
async function getBaselineRevs() {
	const resultParents = await git.raw([
		"rev-list",
		"--parents",
		"-n",
		"1",
		"HEAD"
	]);
	const revList = REV_LIST_REGEXP.exec(resultParents);

	if (!revList) throw new Error("Invalid result from git rev-list");

	const head = await getHead(revList);
	const base = await getBase(revList);

	if (!head || !base) {
		throw new Error("No baseline found");
	}

	return [
		{
			name: "HEAD",
			rev: head
		},
		{
			name: "BASE",
			rev: base
		}
	];
}

function runBenchmark(webpack, config, callback) {
	// warmup
	const warmupCompiler = webpack(config, (err, stats) => {
		if (err) {
			callback(err);
			return;
		}

		warmupCompiler.purgeInputFileSystem();

		const bench = new Benchmark(
			function (deferred) {
				const compiler = webpack(config, (err, stats) => {
					compiler.purgeInputFileSystem();
					if (err) {
						callback(err);
						return;
					}

					if (stats.hasErrors()) {
						callback(new Error(stats.toString()));
						return;
					}

					deferred.resolve();
				});
			},
			{
				maxTime: 30,
				defer: true,
				initCount: 1,
				onComplete() {
					const stats = bench.stats;
					const n = stats.sample.length;
					const nSqrt = Math.sqrt(n);
					const z = tDistribution(n - 1);

					stats.sampleCount = stats.sample.length;
					stats.minConfidence = stats.mean - (z * stats.deviation) / nSqrt;
					stats.maxConfidence = stats.mean + (z * stats.deviation) / nSqrt;
					stats.text = `${Math.round(stats.mean * 1000)} ms ± ${Math.round(
						stats.deviation * 1000
					)} ms [${Math.round(stats.minConfidence * 1000)} ms; ${Math.round(
						stats.maxConfidence * 1000
					)} ms]`;

					callback(null, bench.stats);
				},
				onError: callback
			}
		);

		bench.run({
			async: true
		});
	});
}

/**
 * @param {number} n number of runs
 * @returns {number} distribution
 */
function tDistribution(n) {
	// two-sided, 90%
	// https://en.wikipedia.org/wiki/Student%27s_t-distribution
	if (n <= 30) {
		//            1      2      ...
		const data = [
			6.314, 2.92, 2.353, 2.132, 2.015, 1.943, 1.895, 1.86, 1.833, 1.812, 1.796,
			1.782, 1.771, 1.761, 1.753, 1.746, 1.74, 1.734, 1.729, 1.725, 1.721,
			1.717, 1.714, 1.711, 1.708, 1.706, 1.703, 1.701, 1.699, 1.697
		];
		return data[n - 1];
	} else if (n <= 120) {
		//            30     40     50     60     70     80     90     100    110    120
		const data = [
			1.697, 1.684, 1.676, 1.671, 1.667, 1.664, 1.662, 1.66, 1.659, 1.658
		];
		const a = data[Math.floor(n / 10) - 3];
		const b = data[Math.ceil(n / 10) - 3];
		const f = n / 10 - Math.floor(n / 10);

		return a * (1 - f) + b * f;
	}

	return 1.645;
}

const casesPath = path.join(__dirname, "benchmarkCases");

const tests = [];

for (const folder of await fs.readdir(casesPath)) {
	if (folder.includes("_")) {
		continue;
	}

	try {
		await fs.access(
			path.resolve(casesPath, folder, "webpack.config.js"),
			constants.R_OK
		);
	} catch (_err) {
		continue;
	}

	tests.push(folder);
}

const output = path.join(__dirname, "js");
const baselinesPath = path.join(output, "benchmark-baselines");
const baselines = [];

try {
	await fs.mkdir(baselinesPath, { recursive: true });
} catch (_err) {} // eslint-disable-line no-empty

const baselineRevisions = await getBaselineRevs();

for (const baselineInfo of baselineRevisions) {
	/**
	 * @returns {void}
	 */
	function doLoadWebpack() {
		baselines.push({
			name: baselineInfo.name,
			rev: baselineRevision,
			webpack: () =>
				jest.requireActual(path.resolve(baselinePath, "lib/index.js"))
		});
	}

	const baselineRevision = baselineInfo.rev;
	const baselinePath = path.resolve(baselinesPath, baselineRevision);

	try {
		await fs.access(path.resolve(baselinePath, ".git"), constants.R_OK);
	} catch (_err) {
		try {
			await fs.mkdir(baselinePath);
		} catch (_err) {} // eslint-disable-line no-empty

		const gitIndex = path.resolve(rootPath, ".git/index");
		const index = await fs.readFile(gitIndex);
		const prevHead = await git.raw(["rev-list", "-n", "1", "HEAD"]);

		await simpleGit(baselinePath).raw([
			"--git-dir",
			path.join(rootPath, ".git"),
			"reset",
			"--hard",
			baselineRevision
		]);

		await git.raw(["reset", "--soft", prevHead.split("\n")[0]]);
		await fs.writeFile(gitIndex, index);
	} finally {
		doLoadWebpack();
	}
}

const reportFilePath = path.resolve(output, "benchmark.md");
const report = createWriteStream(reportFilePath, { flags: "w" });

report.write("### Benchmarks:\n\n");

describe("BenchmarkTestCases", function () {
	for (const testName of tests) {
		const testDirectory = path.join(casesPath, testName);
		let headStats = null;

		describe(`${testName} create benchmarks`, function () {
			for (const baseline of baselines) {
				let baselineStats = null;

				// eslint-disable-next-line no-loop-func
				it(`should benchmark ${baseline.name} (${baseline.rev})`, done => {
					const outputDirectory = path.join(
						__dirname,
						"js",
						"benchmark",
						`baseline-${baseline.name}`,
						testName
					);
					const config =
						jest.requireActual(path.join(testDirectory, "webpack.config.js")) ||
						{};

					config.mode = config.mode || "production";
					config.output = config.output || {};

					if (!config.context) config.context = testDirectory;
					if (!config.output.path) config.output.path = outputDirectory;
					runBenchmark(baseline.webpack(), config, (err, stats) => {
						if (err) return done(err);
						report.write(
							`- "${testName}": ${baseline.name} (${baseline.rev}) ${stats.text} (${stats.sampleCount} runs)\n`
						);
						if (baseline.name === "HEAD") headStats = stats;
						else baselineStats = stats;
						done();
					});
				}, 180000);

				if (baseline.name !== "HEAD") {
					// eslint-disable-next-line no-loop-func
					it(`HEAD and ${baseline.name} (${baseline.rev}) results`, function () {
						if (!baselineStats) {
							throw new Error("No baseline stats");
						}

						report.write(`- "${testName}" change: `);
						report.write(
							`HEAD (${headStats.text}) is ${Math.round(
								(baselineStats.mean / headStats.mean) * 100 - 100
							)}% ${baselineStats.maxConfidence < headStats.minConfidence ? "slower than" : baselineStats.minConfidence > headStats.maxConfidence ? "faster than" : "the same as"} BASE (${baseline.name}) (${baselineStats.text})\n`
						);

						report.write(`-----\n`);
					});
				}
			}
		});
	}

	afterAll(() => {
		remove(baselinesPath);
		report.end();
	});
});
