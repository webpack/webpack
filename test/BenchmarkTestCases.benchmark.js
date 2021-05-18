"use strict";

const path = require("path");
const fs = require("graceful-fs");
const asyncLib = require("neo-async");
const Benchmark = require("benchmark");
const { remove } = require("./helpers/remove");

describe("BenchmarkTestCases", function () {
	const casesPath = path.join(__dirname, "benchmarkCases");
	const tests = fs.readdirSync(casesPath).filter(function (folder) {
		return (
			folder.indexOf("_") < 0 &&
			fs.existsSync(path.resolve(casesPath, folder, "webpack.config.js"))
		);
	});

	const baselinesPath = path.join(__dirname, "js", "benchmark-baselines");
	const baselines = [];

	try {
		fs.mkdirSync(path.join(__dirname, "js"));
	} catch (e) {} // eslint-disable-line no-empty
	try {
		fs.mkdirSync(baselinesPath);
	} catch (e) {} // eslint-disable-line no-empty

	beforeAll(function (done) {
		const git = require("simple-git");
		const rootPath = path.join(__dirname, "..");
		getBaselineRevs(rootPath, (err, baselineRevisions) => {
			if (err) return done(err);
			asyncLib.eachSeries(
				baselineRevisions,
				(baselineInfo, callback) => {
					const baselineRevision = baselineInfo.rev;
					const baselinePath = path.resolve(baselinesPath, baselineRevision);
					if (fs.existsSync(path.resolve(baselinePath, ".git"))) {
						doLoadWebpack();
					} else {
						try {
							fs.mkdirSync(baselinePath);
						} catch (e) {} // eslint-disable-line no-empty
						const gitIndex = path.resolve(rootPath, ".git/index");
						const index = fs.readFileSync(gitIndex);
						git(rootPath).raw(
							["rev-list", "-n", "1", "HEAD"],
							(err, prevHead) => {
								if (err) return callback(err);
								git(baselinePath).raw(
									[
										"--git-dir",
										path.join(rootPath, ".git"),
										"reset",
										"--hard",
										baselineRevision
									],
									err => {
										if (err) return callback(err);
										git(rootPath).raw(
											["reset", "--soft", prevHead.split("\n")[0]],
											err => {
												if (err) return callback(err);
												fs.writeFileSync(gitIndex, index);
												try {
													doLoadWebpack();
												} catch (err) {
													callback(err);
												}
											}
										);
									}
								);
							}
						);
					}

					function doLoadWebpack() {
						const baselineWebpack = jest.requireActual(
							path.resolve(baselinePath, "lib/index.js")
						);
						baselines.push({
							name: baselineInfo.name,
							rev: baselineRevision,
							webpack: baselineWebpack
						});
						callback();
					}
				},
				err => {
					if (err) {
						done(err);
						return;
					}
					createTests();
					done();
				}
			);
		});
	}, 270000);

	afterAll(() => {
		remove(baselinesPath);
	});

	function getBaselineRevs(rootPath, callback) {
		const git = require("simple-git")(rootPath);
		const lastVersionTag = "v" + require("../package.json").version;
		git.raw(["rev-list", "-n", "1", lastVersionTag], (err, resultVersion) => {
			if (err) return callback(err);
			const matchVersion = /^([a-f0-9]+)\s*$/.exec(resultVersion);
			if (!matchVersion)
				return callback(new Error("Invalid result from git revparse"));
			const revLastVersion = matchVersion[1];
			git.raw(
				["rev-list", "--parents", "-n", "1", "HEAD"],
				(err, resultParents) => {
					if (err) return callback(err);
					const match = /^([a-f0-9]+)\s*([a-f0-9]+)\s*([a-f0-9]+)?\s*$/.exec(
						resultParents
					);
					if (!match)
						return callback(new Error("Invalid result from git rev-list"));
					const head = match[1];
					const parent1 = match[2];
					const parent2 = match[3];
					if (parent2 && parent1) {
						return callback(
							null,
							[
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
							].filter(Boolean)
						);
					} else if (parent1) {
						return callback(
							null,
							[
								{
									name: "HEAD",
									rev: head
								},
								head !== revLastVersion && {
									name: lastVersionTag,
									rev: revLastVersion
								}
							].filter(Boolean)
						);
					} else {
						return callback(new Error("No baseline found"));
					}
				}
			);
		});
	}

	function tDistribution(n) {
		// two-sided, 90%
		// https://en.wikipedia.org/wiki/Student%27s_t-distribution
		if (n <= 30) {
			//            1      2      ...
			const data = [
				6.314, 2.92, 2.353, 2.132, 2.015, 1.943, 1.895, 1.86, 1.833, 1.812,
				1.796, 1.782, 1.771, 1.761, 1.753, 1.746, 1.74, 1.734, 1.729, 1.725,
				1.721, 1.717, 1.714, 1.711, 1.708, 1.706, 1.703, 1.701, 1.699, 1.697
			];
			return data[n - 1];
		} else if (n <= 120) {
			//            30     40     50     60     70     80     90     100    110    120
			const data = [
				1.697, 1.684, 1.676, 1.671, 1.667, 1.664, 1.662, 1.66, 1.659, 1.658
			];
			var a = data[Math.floor(n / 10) - 3];
			var b = data[Math.ceil(n / 10) - 3];
			var f = n / 10 - Math.floor(n / 10);
			return a * (1 - f) + b * f;
		} else {
			return 1.645;
		}
	}

	function runBenchmark(webpack, config, callback) {
		// warmup
		const warmupCompiler = webpack(config, (err, stats) => {
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
							callback(new Error(stats.toJson().errors.join("\n\n")));
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

	function createTests() {
		tests.forEach(testName => {
			const testDirectory = path.join(casesPath, testName);
			let headStats = null;
			describe(`${testName} create benchmarks`, function () {
				baselines.forEach(baseline => {
					let baselineStats = null;
					it(`should benchmark ${baseline.name} (${baseline.rev})`, function (done) {
						const outputDirectory = path.join(
							__dirname,
							"js",
							"benchmark",
							`baseline-${baseline.name}`,
							testName
						);
						const config =
							Object.create(
								jest.requireActual(
									path.join(testDirectory, "webpack.config.js")
								)
							) || {};
						config.output = Object.create(config.output || {});
						if (!config.context) config.context = testDirectory;
						if (!config.output.path) config.output.path = outputDirectory;
						runBenchmark(baseline.webpack, config, (err, stats) => {
							if (err) return done(err);
							process.stderr.write(`        ${baseline.name} ${stats.text}`);
							if (baseline.name === "HEAD") headStats = stats;
							else baselineStats = stats;
							done();
						});
					}, 180000);

					it(`should benchmark ${baseline.name} (${baseline.rev})`, done => {
						const outputDirectory = path.join(
							__dirname,
							"js",
							"benchmark",
							`baseline-${baseline.name}`,
							testName
						);
						const config =
							jest.requireActual(
								path.join(testDirectory, "webpack.config.js")
							) || {};
						config.output = config.output || {};
						if (!config.context) config.context = testDirectory;
						if (!config.output.path) config.output.path = outputDirectory;
						runBenchmark(baseline.webpack, config, (err, stats) => {
							if (err) return done(err);
							process.stderr.write(`        ${baseline.name} ${stats.text}`);
							if (baseline.name === "HEAD") headStats = stats;
							else baselineStats = stats;
							done();
						});
					}, 180000);

					if (baseline.name !== "HEAD") {
						it(`HEAD should not be slower than ${baseline.name} (${baseline.rev})`, function () {
							if (baselineStats.maxConfidence < headStats.minConfidence) {
								throw new Error(
									`HEAD (${headStats.text}) is slower than ${baseline.name} (${baselineStats.text}) (90% confidence)`
								);
							} else if (
								baselineStats.minConfidence > headStats.maxConfidence
							) {
								console.log(
									`======> HEAD is ${Math.round(
										(baselineStats.mean / headStats.mean) * 100 - 100
									)}% faster than ${baseline.name} (90% confidence)!`
								);
							}
						});
					}
				});
			});
		});
	}
});
