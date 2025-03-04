const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute: ({ outputPath }) => {
		const bundleFile = path.resolve(outputPath, "main.js");
		const code = fs.readFileSync(bundleFile, "utf-8");

		// Check for expected import statement
		const expectedImport = 'import*as e from"./external-module"';

		if (!code.includes(expectedImport)) {
			throw new Error(
				`Expected '${expectedImport}' in the build output, but it was missing. Actual output:\n${code}`
			);
		}

		// Also check that webpack runtime code is properly included
		if (!code.includes("localValue")) {
			throw new Error("Expected 'localValue' export in the output.");
		}

		if (!code.includes("localFunction")) {
			throw new Error("Expected 'localFunction' export in the output.");
		}
	}
};
