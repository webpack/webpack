const vendor = require("vendor-lib");

it("should report both mixed chunks, ordered by a stable tie-break", () => {
	expect(vendor).toBe("vendor");
});
