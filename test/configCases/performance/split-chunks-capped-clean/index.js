const vendor = require("vendor-lib");

it("should stay quiet when the split fits inside the request budget", () => {
	expect(vendor).toBe("vendor");
});
