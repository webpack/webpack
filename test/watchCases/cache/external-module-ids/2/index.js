const keep = require("./keep");
const first = require("../shared");

it("should use the smallest request after restoring another request", () => {
	expect(first).toBe(keep.value);
	expect(keep.id).toBe("../shared");
});
