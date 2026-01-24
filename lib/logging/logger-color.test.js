const createConsoleLogger = require("../../lib/logging/createConsoleLogger");

describe("Console logger colors", () => {
	it("prints errors in red", () => {
		let output = "";
		const logger = createConsoleLogger({
			write: msg => (output += msg)
		});

		logger.error("Build failed");

		expect(output).toContain("\u001b[31m");
	});

	it("prints warnings in yellow", () => {
		let output = "";
		const logger = createConsoleLogger({
			write: msg => (output += msg)
		});

		logger.warn("Deprecated API");

		expect(output).toContain("\u001b[33m");
	});
});
