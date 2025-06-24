const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return "./main.mjs";
	},
	beforeExecute() {
		// Copy external module files to the test output directory
		const testDirectory = path.join(
			__dirname,
			"../../../js/ConfigTestCases/module/circular-externals"
		);
		fs.mkdirSync(testDirectory, { recursive: true });
		fs.copyFileSync(
			path.join(__dirname, "external-a.mjs"),
			path.join(testDirectory, "external-a.mjs")
		);
		fs.copyFileSync(
			path.join(__dirname, "external-b.mjs"),
			path.join(testDirectory, "external-b.mjs")
		);
	}
};
