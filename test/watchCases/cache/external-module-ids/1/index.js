const keep = require("./keep");

it("should use the original name when only one request remains", () => {
	expect(typeof keep.value.join).toBe("function");
	expect(keep.id).toBe("./shared");
});
