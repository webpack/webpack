it("should preserve imports needed by barrel initialization without provided exports analysis", () => {
	const { value } = require("./consumer.js");
	expect(value).toBe(1);
});
