const value = require("./value");

it("keeps loader threads enabled when output options are functions", () => {
	expect(value).toBe("worker");
});
