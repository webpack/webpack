const dynamic = require("./dynamic");

it("should report modules whose exports cannot be read", () => {
	expect(dynamic.known).toBe(2);
});
