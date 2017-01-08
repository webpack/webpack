"use strict";

/* globals describe it */
const should = require("should");
const path = require("path");
const fs = require("fs");
const defaultArgs = require("./binCases/ARGUMENTS.json");

describe("BinTestCases", function() {
	const casesPath = path.join(__dirname, "binCases");
	let categories = fs.readdirSync(casesPath).filter((folder) => {
		return fs.statSync(path.join(casesPath, folder)).isDirectory()
	});
	categories = categories.map(cat => {
		return {
			name: cat,
			tests: fs.readdirSync(path.join(casesPath, cat)).filter(function(folder) {
				return folder.indexOf("_") < 0 || folder.indexOf("ARGUMENTS") < 0;
			})
		};
	});

	categories.forEach(category => {
		describe(category.name, function() {

			category.tests.forEach(testName => {
				let suite = describe(testName, function() {});
				let testArgs = defaultArgs;
				let outputPath = path.join(path.resolve("../../js/bin"), category.name, testName);
				const testDirectory = path.join(casesPath, category.name, testName);
				const execHandler = require(path.join(testDirectory, "test.js"));
				const execOptions = {
					cwd: `${path.resolve("./", testDirectory)}`
				};

				try { // check if test specfic args exist
					testArgs = Object.assign(
						testArgs, require(path.join(testDirectory, "ARGUMENTS.json"))
					);
				} catch(e) {}

				execHandler(`${path.resolve(process.cwd(), "bin/webpack.js")}`, argsToArray(testArgs).concat(["--output-path", `${outputPath}`]), execOptions);
			});
		});
	});
});

function argsToArray(argsObject) {
	const argsArray = [];

	for(let argKey in argsObject) {
		argsArray.push(argKey);
		argsArray.push(argsObject[argKey]);
	}

	return argsArray;
}
