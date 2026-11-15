const value = require("./value");

it("does not deadlock when a worker loader builds another threaded module", () => {
	expect(value).toBe("value:loaded");
});
