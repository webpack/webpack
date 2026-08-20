const vendor = require("vendor-lib");

it("should report an initial chunk that mixes vendor and application code", () => {
	expect(vendor).toBe("vendor");
});
