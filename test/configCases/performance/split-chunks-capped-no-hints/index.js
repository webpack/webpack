const vendor = require("vendor-lib");

it("should record nothing while hints are off", () => {
	expect(vendor).toBe("vendor");
});
