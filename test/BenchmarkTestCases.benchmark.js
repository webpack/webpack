"use strict";

const should = require("should");
const path = require("path");
const fs = require("fs");
const async = require("async");
var Test = require("mocha/lib/test");

const webpack = require("../lib/webpack");
const Benchmark = require("benchmark");

describe("BenchmarkTestCases", function() {
	const casesPath = path.join(__dirname, "benchmarkCases");
	const tests = fs.readdirSync(casesPath).filter(function(folder) {
		return folder.indexOf("_") < 0 && fs.existsSync(path.resolve(casesPath, folder, "webpack.config.js"));
	});

	const baselinesPath = path.join(__dirname, "js", "benchmark-baselines");
	const baselines = [];

	try {
		fs.mkdirSync(path.join(__dirname, "js"));
	} catch(e) {}
	try {
		fs.mkdirSync(baselinesPath);
	} catch(e) {}

	before(function(done) {
		this.timeout(270000);
		const git = require("simple-git");
		const rootPath = path.join(__dirname, "..");
		getBaselineRevs(rootPath, (err, baselineRevisions) => {
			if(err) return done(err);
			async.eachSeries(baselineRevisions, (baselineInfo, callback) => {
				const baselineRevision = baselineInfo.rev;
				const baselinePath = path.resolve(baselinesPath, baselineRevision);
				if(fs.existsSync(path.resolve(baselinePath, ".git"))) {
					doLoadWebpack()
				} else {
					try {
						fs.mkdirSync(baselinePath);
					} catch(e) {}
					git(baselinePath).raw(["--git-dir", path.join(rootPath, ".git"), "reset", "--hard", baselineRevision], err => {
						if(err) return callback(err);
						doLoadWebpack();
					});
				}

				function doLoadWebpack() {
					const baselineWebpack = require(path.resolve(baselinePath, "lib/webpack.js"));
					baselines.push({
						name: baselineInfo.name,
						rev: baselineRevision,
						webpack: baselineWebpack
					});
					callback();
				}
			}, done)
		});
	});

	function getBaselineRevs(rootPath, callback) {
		const git = require("simple-git")(rootPath);
		const lastVersionTag = "v" + require("../package.json").version;
		git.raw(["rev-list", "-n", "1", lastVersionTag], (err, resultVersion) => {
			if(err) return callback(err);
			const matchVersion = /^([a-f0-9]+)\s*$/.exec(resultVersion);
			if(!matchVersion) return callback(new Error("Invalid result from git revparse"));
			const revLastVersion = matchVersion[1];
			git.raw(["rev-list", "--parents", "-n", "1", "HEAD"], (err, resultParents) => {
				if(err) return callback(err);
				const match = /^([a-f0-9]+)\s*([a-f0-9]+)\s*([a-f0-9]+)?\s*$/.exec(resultParents);
				if(!match) return callback(new Error("Invalid result from git rev-list"));
				const head = match[1]
				const parent1 = match[2];
				const parent2 = match[3];
				if(parent2 && parent1) {
					return callback(null, [{
						name: "HEAD",
						rev: head
					}, head !== revLastVersion && {
						name: lastVersionTag,
						rev: revLastVersion
					}, parent1 !== revLastVersion && head !== revLastVersion && {
						name: "base",
						rev: parent1
					}].filter(Boolean));
				} else if(parent1) {
					return callback(null, [{
						name: "HEAD",
						rev: head
					}, head !== revLastVersion && {
						name: lastVersionTag,
						rev: revLastVersion
					}].filter(Boolean));
				} else {
					return callback(new Error("No baseline found"));
				}
			});
		});
	}

	function runBenchmark(webpack, config, callback) {
		// warmup
		const warmupCompiler = webpack(config, (err, stats) => {
			warmupCompiler.purgeInputFileSystem();
			const bench = new Benchmark(function(deferred) {
				const compiler = webpack(config, (err, stats) => {
					compiler.purgeInputFileSystem();
					if(err) {
						deferred.reject(err);
						return;
					}
					if(stats.hasErrors()) {
						deferred.reject(new Error(stats.toJson().errors.join("\n\n")));
						return;
					}
					deferred.resolve();
				});
			}, {
				maxTime: 30,
				defer: true,
				initCount: 1,
				onComplete: function() {
					callback(null, bench.stats);
				},
				onError: callback
			});
			bench.run({
				async: true
			});
		});
	}

	tests.forEach(testName => {
		const testDirectory = path.join(casesPath, testName);
		let headStats = null;
		const suite = describe(testName, function() {});
		it(`${testName} create benchmarks`, function() {
			baselines.forEach(baseline => {
				let baselineStats = null;

				function it(title, fn) {
					const test = new Test(title, fn);
					suite.addTest(test);
				}
				it(`should benchmark ${baseline.name} (${baseline.rev})`, function(done) {
					this.timeout(180000);
					const outputDirectory = path.join(__dirname, "js", "benchmark", `baseline-${baseline.name}`, testName);
					const config = Object.create(require(path.join(testDirectory, "webpack.config.js")));
					config.output = Object.create(config.output || {});
					if(!config.context) config.context = testDirectory;
					if(!config.output.path) config.output.path = outputDirectory;
					runBenchmark(baseline.webpack, config, (err, stats) => {
						if(err) return done(err);
						console.log(`        ${baseline.name} ${Math.round(stats.mean * 1000)}ms ± ${Math.round(stats.deviation * 1000)}ms`);
						if(baseline.name === "HEAD")
							headStats = stats;
						else
							baselineStats = stats;
						done();
					});
				});

				if(baseline.name !== "HEAD") {
					it(`HEAD should not be slower than ${baseline.name} (${baseline.rev})`, function() {
						if(baselineStats.mean + baselineStats.deviation < headStats.mean - headStats.deviation) {
							throw new Error(`HEAD (${baselineStats.mean} ± ${baselineStats.deviation}) is slower than ${baseline.name} (${headStats.mean} ± ${headStats.deviation})`);
						} else if(baselineStats.mean - baselineStats.deviation > headStats.mean + headStats.deviation) {
							console.log(`======> HEAD is ${Math.round(baselineStats.mean / headStats.mean * 100 - 100)}% faster than ${baseline.name}!`);
						}
					});
				}
			});
		});
	});
});
