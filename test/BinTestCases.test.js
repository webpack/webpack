"use strict";

/* globals describe it */
const should = require("should");
const path = require("path");
const fs = require("fs");
const childProcess = require("child_process");

describe("BinTestCases", () => {
	const casesPath = path.join(__dirname, "binCases");
	let categories = fs.readdirSync(casesPath);
	categories = categories.map(cat => {
		return {
			name: cat,
			tests: fs.readdirSync(path.join(casesPath, cat)).filter(function(folder) {
				return folder.indexOf("_") < 0;
			})
		};
	});

	categories.forEach(category => {
		describe(category.name, () => {
			category.tests.forEach(testName => {
				let suite = describe(testName, () => {});
				it(`${testName} should compile from bin`, function(done) {
					this.timeout(30000);
					const testDirectory = path.join(casesPath, category.name, testName);
					const outputDirectory = path.join(__dirname, "js", "bin", category.name, testName);
					const configPath = path.join(testDirectory, "webpack.config.js");
					const outputFilename = "[name].chunk.js";

					function execHandler(error, stdout, stderr) {
						if(stderr)
							throw new Error(error);
						if(error !== null)
							throw new Error(error);

						stdout.should.be.ok;
						stderr.should.be.empty;
						done();
					}

					childProcess.exec(`node ./bin/webpack.js --config ${configPath} --output-filename ${outputFilename} --output-path ${outputDirectory}`, execHandler);
				});
			});
		});
	});

});
