const propertyAccess = require("../lib/util/propertyAccess");

describe("propertyAccess", () => {
	it("brackets but does not quote numbers", () => {
		expect(propertyAccess(["12"])).toBe("[12]");
	});

	it("brackets and quotes special cases", () => {
		expect(propertyAccess(["class"])).toBe('["class"]');
		expect(propertyAccess(["white space"])).toBe('["white space"]');
		expect(propertyAccess(["3cc"])).toBe('["3cc"]');
	});

	it("uses dot notation on all other cases", () => {
		expect(propertyAccess(["a"])).toBe(".a");
		expect(propertyAccess(["_xyz"])).toBe("._xyz");
		expect(propertyAccess(["cc3"])).toBe(".cc3");
	});

	it("handles multiple levels", () => {
		expect(propertyAccess(["a", "b", "c"])).toBe(".a.b.c");
		expect(propertyAccess(["null", "await", "if"])).toBe(
			'["null"]["await"]["if"]'
		);
	});
});
