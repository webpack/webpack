const vendor = require("vendor-lib");
const other = require("other-lib");

it("should report every refused split, ordered by a stable tie-break", () => {
	expect(vendor).toBe("vendor");
	expect(other).toBe("other");
});
