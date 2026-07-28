"use strict";

it("should resolve an aliased package directory whose name ends with .js", () => {
	expect(require("vendor/pkg.js")).toBe("pkg.js");
});
