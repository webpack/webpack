it("should error loadModule when a cycle with 2 modules is requested", () => {
	expect(require("./loader!./2/a")).toMatch(
		/^source: err: There is a circular build dependency/
	);
});
it("should error loadModule when a cycle with 3 modules is requested", () => {
	expect(require("./loader!./3/a")).toMatch(
		/^source: source: err: There is a circular build dependency/
	);
});
it("should error loadModule when requesting itself", () => {
	expect(require("./loader!./1/a")).toMatch(
		/^err: There is a circular build dependency/
	);
});
