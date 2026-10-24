const first = require("./shared");
const second = require("../shared");
const keep = require("./keep");

it("should use the smallest request for a shared external", () => {
	expect(first).toBe(second);
	expect(first).toBe(keep.value);
	expect(keep.id).toBe("../shared");
});
