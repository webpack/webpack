const value = require("./value");

it("runs the loader chain in a worker", () => {
	expect(value).toBe("worker:42:true:loaded");
});
