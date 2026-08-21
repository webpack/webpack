// Required zebra-first, so the tie-break is the only thing that can report
// alpha first.
const zebra = require("./zebra");
const alpha = require("./alpha");

it("should report equally sized modules in a stable order", () => {
	expect(zebra.known).toBe(2);
	expect(alpha.known).toBe(2);
});
