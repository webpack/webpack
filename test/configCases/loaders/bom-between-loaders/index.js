it("should not pass a BOM a loader produced to the next loader", () => {
	const seen = require("./string");

	expect(seen.startsWithBOM).toBe(false);
	expect(seen.source).toBe('module.exports = "string ©";\n');
});

it("should not pass a BOM a loader produced to the next raw loader", () => {
	const seen = require("./buffer");

	expect(seen.startsWithBOM).toBe(false);
	expect(seen.source).toBe('module.exports = "buffer ©";\n');
});
