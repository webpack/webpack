it("should error loadModule when a cycle with 2 modules is requested", () => {
	const errorMessage = require("./loader!./2/a");
	expect(errorMessage).toMatch(
		/^source: err: There is a circular build dependency/
	);
	// Verify enhanced error message includes dependency chain information
	expect(errorMessage).toMatch(/Circular dependency detected/);
	expect(errorMessage).toMatch(/Circular dependency chain:/);
	expect(errorMessage).toMatch(/\s*→ .*\/2\/a\.json/);
	expect(errorMessage).toMatch(/\s*→ .*\/2\/b\.json/);
	expect(errorMessage).toMatch(/\s*↻ .*\/2\/a\.json/);
	expect(errorMessage).toMatch(/To fix this circular dependency:/);
	expect(errorMessage).toMatch(
		/- Extract shared code from .*\/2\/a\.json and .*\/2\/b\.json to a separate module/
	);
});
it("should error loadModule when a cycle with 3 modules is requested", () => {
	const errorMessage = require("./loader!./3/a");
	expect(errorMessage).toMatch(
		/^source: source: err: There is a circular build dependency/
	);
	// Verify enhanced error message includes dependency chain information
	expect(errorMessage).toMatch(/Circular dependency detected/);
	expect(errorMessage).toMatch(/Circular dependency chain:/);
	expect(errorMessage).toMatch(/\s*→ .*\/3\/a\.json/);
	expect(errorMessage).toMatch(/\s*→ .*\/3\/b\.json/);
	expect(errorMessage).toMatch(/\s*→ .*\/3\/c\.json/);
	expect(errorMessage).toMatch(/\s*↻ .*\/3\/a\.json/);
	expect(errorMessage).toMatch(/To fix this circular dependency:/);
});
it("should error loadModule when requesting itself", () => {
	const errorMessage = require("./loader!./1/a");
	expect(errorMessage).toMatch(
		/^err: There is a circular build dependency/
	);
	// Verify enhanced error message includes dependency chain information
	expect(errorMessage).toMatch(/Circular dependency detected/);
	expect(errorMessage).toMatch(/Circular dependency chain:/);
	expect(errorMessage).toMatch(/\s*→ .*\/1\/a\.json/);
	expect(errorMessage).toMatch(/\s*↻ .*\/1\/a\.json/);
	expect(errorMessage).toMatch(/To fix this circular dependency:/);
});
