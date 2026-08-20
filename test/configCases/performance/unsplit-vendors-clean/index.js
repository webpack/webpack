const vendor = require("vendor-lib");

it("should stay quiet when a cache group holds the vendor code", () => {
	expect(vendor).toBe("vendor");
});
