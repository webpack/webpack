const vendor = require("vendor-lib");

it("should name the cap that refused the split of an initial chunk", () => {
	expect(vendor).toBe("vendor");
});
