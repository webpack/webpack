const vendor = require("vendor-lib");

it("should report the split the request cap refused", () => {
	expect(vendor).toBe("vendor");
});
