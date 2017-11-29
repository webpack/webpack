/* globals describe it before */
"use strict";

const should = require("should");
const path = require("path");
const fs = require("fs");
const child_process = require("child_process");

function spawn(args, options) {
	if(process.env.running_under_istanbul) {
		args = ["--no-deprecation", require.resolve("istanbul/lib/cli.js"), "cover", "--report", "none", "--print", "none", "--include-pid", "--dir", path.resolve("coverage"), "--", require.resolve("./helpers/exec-in-directory.js"), options.cwd].concat(args);
		options = Object.assign({}, options, {
			cwd: undefined
		});
	}
	return child_process.spawn(process.execPath, ["--no-deprecation"].concat(args), options);
}

function loadOptsFile(optsPath) {
	// Options file parser from Mocha
	// https://github.com/mochajs/mocha/blob/2bb2b9fa35818db7a02e5068364b0c417436b1af/bin/options.js#L25-L31
	return fs.readFileSync(optsPath, "utf8")
		.replace(/\\\s/g, "%20")
		.split(/\s/)
		.filter(Boolean)
		.map((value) => value.replace(/%20/g, " "));
}

function getTestSpecificArguments(testDirectory) {
	try {
		return loadOptsFile(path.join(testDirectory, "test.opts"));
	} catch(e) {
		return null;
	}
}

function convertToArrayOfLines(outputArray) {
	if(outputArray.length === 0) return outputArray;
	return outputArray.join("").split("\n");
}

function findTestsRecursive(readPath) {
	const entries = fs.readdirSync(readPath);
	const isAnyTests = entries.indexOf("test.js") !== -1;

	const folders = entries
		.map(entry => path.join(readPath, entry))
		.filter(entry => fs.statSync(entry).isDirectory());

	const result = isAnyTests ? [readPath] : [];

	return result.concat(folders.map(findTestsRecursive).reduce((acc, list) => acc.concat(list), []));
}

const casesPath = path.join(__dirname, "binCases");
const defaultArgs = loadOptsFile(path.join(casesPath, "test.opts"));

describe("BinTestCases", function() {
	const tests = findTestsRecursive(casesPath);

	tests.forEach(testDirectory => {
		const testName = testDirectory.replace(casesPath, "");
		const testArgs = getTestSpecificArguments(testDirectory) || defaultArgs;
		const testAssertions = require(path.join(testDirectory, "test.js"));
		const outputPath = path.join(path.resolve(casesPath, "../js/bin"), testName);

		const cmd = `${path.resolve(process.cwd(), "bin/webpack.js")}`;
		const args = testArgs.concat(["--output-path", `${outputPath}`]);
		const opts = {
			cwd: path.resolve("./", testDirectory)
		};

		const asyncExists = fs.existsSync(path.join(testDirectory, "async"));

		const env = {
			stdout: [],
			stderr: [],
			error: []
		};

		if(asyncExists) {
			describe(testName, function() {
				it("should run successfully", function(done) {
					this.timeout(10000);
					const child = spawn([cmd].concat(args), opts);

					child.on("close", (code) => {
						env.code = code;
					});

					child.on("error", (error) => {
						env.error.push(error);
					});

					child.stdout.on("data", (data) => {
						env.stdout.push(data);
					});

					child.stderr.on("data", (data) => {
						env.stderr.push(data);
					});

					setTimeout(() => {
						if(env.code) {
							done(`Watch didn't run ${env.error}`);
						}

						const stdout = convertToArrayOfLines(env.stdout);
						const stderr = convertToArrayOfLines(env.stderr);
						testAssertions(stdout, stderr, done);
						child.kill();
					}, 8000); // wait a little to get an output
				});
			});
		} else {
			describe(testName, function() {
				before(function(done) {
					this.timeout(20000);

					const child = spawn([cmd].concat(args), opts);

					child.on("close", (code) => {
						env.code = code;
						done();
					});

					child.on("error", (error) => {
						env.error.push(error);
					});

					child.stdout.on("data", (data) => {
						env.stdout.push(data);
					});

					child.stderr.on("data", (data) => {
						env.stderr.push(data);
					});
				});

				it("should not cause any errors", function() {
					should(env.error).be.empty();
				});

				it("should run successfully", function() {
					const stdout = convertToArrayOfLines(env.stdout);
					const stderr = convertToArrayOfLines(env.stderr);
					testAssertions(env.code, stdout, stderr);
				});
			});
		}
	});
});
