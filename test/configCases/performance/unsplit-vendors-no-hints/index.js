const vendor = require("vendor-lib");

it("should report nothing while hints are off", () => {
	expect(vendor).toBe("vendor");
});
