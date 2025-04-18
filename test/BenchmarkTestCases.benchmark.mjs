"use strict";

import path from "path";
import fs from "fs/promises";
import Benchmark from "benchmark";
import { remove } from "./helpers/remove";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import simpleGit from "simple-git";
import { jest } from "@jest/globals";

async function getBaselineRevs(rootPath) {
	const git = simpleGit(rootPath);
	const pkgJSON = JSON.parse(
		await fs.readFile(path.resolve(__dirname, "../package.json"))
	);
	const lastVersionTag = `v${pkgJSON.version}`;
	const resultVersion = await git.raw(["rev-list", "-n", "1", lastVersionTag]);
	const matchVersion = /^([a-f0-9]+)\s*$/.exec(resultVersion);

	if (!matchVersion) throw new Error("Invalid result from git revparse");

	const revLastVersion = matchVersion[1];
	const resultParents = await git.raw([
		"rev-list",
		"--parents",
		"-n",
		"1",
		"HEAD"
	]);
	const match = /^([a-f0-9]+)\s*([a-f0-9]+)\s*([a-f0-9]+)?\s*$/.exec(
		resultParents
	);

	if (!match) throw new Error("Invalid result from git rev-list");

	const head = match[1];
	const parent1 = match[2];
	const parent2 = match[3];

	if (parent2 && parent1) {
		return [
			{
				name: "HEAD",
				rev: head
			},
			head !== revLastVersion && {
				name: lastVersionTag,
				rev: revLastVersion
			},
			parent1 !== revLastVersion &&
				head !== revLastVersion && {
					name: "base",
					rev: parent1
				}
		].filter(Boolean);
	} else if (parent1) {
		return [
			{
				name: "HEAD",
				rev: head
			},
			head !== revLastVersion && {
				name: lastVersionTag,
				rev: revLastVersion
			}
		].filter(Boolean);
	}

	throw new Error("No baseline found");
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
				onComplete: function () {
					const stats = bench.stats;
					const n = stats.sample.length;
					const nSqrt = Math.sqrt(n);
					const z = tDistribution(n - 1);

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const casesPath = path.join(__dirname, "benchmarkCases");

const tests = [];

for (const folder of await fs.readdir(casesPath)) {
	if (folder.includes("_")) {
		continue;
	}

	try {
		await fs.access(
			path.resolve(casesPath, folder, "webpack.config.js"),
			fs.constants.R_OK
		);
	} catch (e) {
		continue;
	}

	tests.push(folder);
}

const baselinesPath = path.join(__dirname, "js", "benchmark-baselines");
const baselines = [];

try {
	await fs.mkdir(path.join(__dirname, "js"));
} catch (_err) {} // eslint-disable-line no-empty

try {
	await fs.mkdir(baselinesPath);
} catch (_err) {} // eslint-disable-line no-empty

const rootPath = path.join(__dirname, "..");
const baselineRevisions = await getBaselineRevs(rootPath);

for (const baselineInfo of baselineRevisions) {
	function doLoadWebpack() {
		baselines.push({
			name: baselineInfo.name,
			rev: baselineRevision,
			webpack: () => {
				return jest.requireActual(path.resolve(baselinePath, "lib/index.js"));
			}
		});
	}

	const baselineRevision = baselineInfo.rev;
	const baselinePath = path.resolve(baselinesPath, baselineRevision);

	try {
		await fs.access(path.resolve(baselinePath, ".git"), fs.constants.R_OK);
	} catch (_err) {
		try {
			await fs.mkdir(baselinePath);
		} catch (_err) {} // eslint-disable-line no-empty

		const gitIndex = path.resolve(rootPath, ".git/index");
		const index = await fs.readFile(gitIndex);
		const prevHead = await simpleGit(rootPath).raw([
			"rev-list",
			"-n",
			"1",
			"HEAD"
		]);

		await simpleGit(baselinePath).raw([
			"--git-dir",
			path.join(rootPath, ".git"),
			"reset",
			"--hard",
			baselineRevision
		]);

		await simpleGit(rootPath).raw(["reset", "--soft", prevHead.split("\n")[0]]);
		await fs.writeFile(gitIndex, index);
	} finally {
		doLoadWebpack();
	}
}

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
						process.stderr.write(`        ${baseline.name} ${stats.text}`);
						if (baseline.name === "HEAD") headStats = stats;
						else baselineStats = stats;
						done();
					});
				}, 180000);

				if (baseline.name !== "HEAD") {
					// eslint-disable-next-line no-loop-func
					it(`HEAD should not be slower than ${baseline.name} (${baseline.rev})`, function () {
						if (!baselineStats) {
							throw new Error("No baseline stats");
						}

						if (baselineStats.maxConfidence < headStats.minConfidence) {
							throw new Error(
								`${testName} HEAD (${headStats.text}) is slower than ${baseline.name} (${baselineStats.text}) (90% confidence)`
							);
						} else if (baselineStats.minConfidence > headStats.maxConfidence) {
							console.log(
								`======> ${testName} HEAD is ${Math.round(
									(baselineStats.mean / headStats.mean) * 100 - 100
								)}% faster than ${baseline.name} (90% confidence)!\n`
							);
						} else if (
							baselineStats.minConfidence === headStats.maxConfidence
						) {
							console.log(
								`======> ${testName} HEAD is ${Math.round(
									(baselineStats.mean / headStats.mean) * 100 - 100
								)}% is the same ${baseline.name}!\n`
							);
						}
					});
				}
			}
		});
	}

	afterAll(() => {
		remove(baselinesPath);
	});
});
