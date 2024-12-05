const path = require("path");
const fs = require("fs");

// Utility function to load all test cases dynamically
const loadTestCases = directory => {
	const tests = fs
		.readdirSync(directory)
		.filter(file => file.endsWith(".test.js"))
		.map(file => path.resolve(directory, file));

	for (const testFile of tests) {
		require(testFile);
	}
};

// Load and execute test cases from subdirectories
describe("Webpack Test Cases", () => {
	loadTestCases(path.resolve(__dirname, "hot-module-replacement"));
});
