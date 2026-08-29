// The fixtures are checked out with CRLF on Windows, and the BOM is what this
// case is about, so compare the content with line endings normalized.
const normalize = (source) => source.replace(/\r\n/g, "\n");

it("should not pass a BOM a loader produced to the next loader", () => {
	const seen = require("./string");

	expect(seen.startsWithBOM).toBe(false);
	expect(normalize(seen.source)).toBe('module.exports = "string ©";\n');
});

it("should not pass a BOM a loader produced to the next raw loader", () => {
	const seen = require("./buffer");

	expect(seen.startsWithBOM).toBe(false);
	expect(normalize(seen.source)).toBe('module.exports = "buffer ©";\n');
});
