"use strict";

/* globals describe it */
const should = require("should");
const path = require("path");
const fs = require("fs");
const spawn = require("child_process").spawn;

function loadOptsFile(optsPath) {
	// Options file parser from Mocha
	// https://github.com/mochajs/mocha/blob/2bb2b9fa35818db7a02e5068364b0c417436b1af/bin/options.js#L25-L31
	return fs.readFileSync(optsPath, 'utf8')
		.replace(/\\\s/g, '%20')
		.split(/\s/)
		.filter(Boolean)
		.map(function(value) {
			return value.replace(/%20/g, ' ');
		});
}

function getTestSpecificArguments(testDirectory) {
	try {
		return loadOptsFile(path.join(testDirectory, "test.opts"));
	} catch(e) {
		return [];
	}
}

function convertToArrayOfLines(outputArray) {
	if(outputArray.length === 0) return outputArray;
	return outputArray.join('').split('\n');
}

const casesPath = path.join(__dirname, "binCases");
const defaultArgs = loadOptsFile(path.join(casesPath, "test.opts"));

describe("BinTestCases", function() {
	const categoryDirectories = fs.readdirSync(casesPath).filter((folder) => {
		return fs.statSync(path.join(casesPath, folder)).isDirectory()
	});

	const categories = categoryDirectories.map(function(categoryDirectory) {
		return {
			name: categoryDirectory,
			tests: fs.readdirSync(path.join(casesPath, categoryDirectory))
		};
	});

	categories.forEach(function(category) {
		describe(category.name, function() {

			category.tests.forEach(function(testName) {
				const testDirectory = path.join(casesPath, category.name, testName);
				const testArgs = defaultArgs.concat(getTestSpecificArguments(testDirectory));
				const testAssertions = require(path.join(testDirectory, "test.js"));
				const outputPath = path.join(path.resolve(casesPath, "../js/bin"), category.name, testName);

				const cmd = `${path.resolve(process.cwd(), "bin/webpack.js")}`;
				const args = testArgs.concat(["--output-path", `${outputPath}`]);
				const opts = {
					cwd: path.resolve("./", testDirectory)
				};

				const async = fs.existsSync(path.join(testDirectory, "async"));

				const env = {
					stdout: [],
					stderr: [],
					error: []
				};

				if(async) {
					describe(testName, function() {
						it("should run successfully", function(done) {
							this.timeout(10000);
							const child = spawn(process.execPath, [cmd].concat(args), opts);

							child.on("close", function(code) {
								env.code = code;
							});

							child.on("error", function(error) {
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
									done(`Watch didn't run ${env.error}`)
								}

								const stdout = convertToArrayOfLines(env.stdout);
								const stderr = convertToArrayOfLines(env.stderr);
								testAssertions(stdout, stderr, done);
								child.kill()
							}, 3000); // wait a little to get an output
						});
					})
				} else {
					describe(testName, function() {
						before(function(done) {
							this.timeout(20000);

							const child = spawn(process.execPath, [cmd].concat(args), opts);

							child.on("close", function(code) {
								env.code = code;
								done();
							});

							child.on("error", function(error) {
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
	});
});
