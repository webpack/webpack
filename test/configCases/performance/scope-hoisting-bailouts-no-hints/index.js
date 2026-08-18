const cjs = require("./cjs");

it("should stay silent when hints are off", () => {
	expect(cjs.fromCjs).toBe(1);
	expect(__STATS__.hints).toHaveLength(0);
});
