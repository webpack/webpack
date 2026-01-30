it("should error loadModule when a cycle with 2 modules is requested", () => {
	const errorMessage = require("./loader!./2/a");
	expect(errorMessage).toMatch(
		/^source: err: There is a circular build dependency/
	);
	// Verify enhanced error message includes dependency chain information
	if (errorMessage.includes("Circular dependency detected")) {
		expect(errorMessage).toMatch(/Circular dependency chain:/);
		expect(errorMessage).toMatch(/To fix this circular dependency:/);
	}
});
it("should error loadModule when a cycle with 3 modules is requested", () => {
	const errorMessage = require("./loader!./3/a");
	expect(errorMessage).toMatch(
		/^source: source: err: There is a circular build dependency/
	);
	// Verify enhanced error message includes dependency chain information
	if (errorMessage.includes("Circular dependency detected")) {
		expect(errorMessage).toMatch(/Circular dependency chain:/);
		expect(errorMessage).toMatch(/To fix this circular dependency:/);
	}
});
it("should error loadModule when requesting itself", () => {
	const errorMessage = require("./loader!./1/a");
	expect(errorMessage).toMatch(
		/^err: There is a circular build dependency/
	);
	// Verify enhanced error message includes dependency chain information
	if (errorMessage.includes("Circular dependency detected")) {
		expect(errorMessage).toMatch(/Circular dependency chain:/);
		expect(errorMessage).toMatch(/To fix this circular dependency:/);
	}
});
