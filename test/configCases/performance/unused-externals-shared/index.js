const first = require("first");
const second = require("second");
const path = require("node:path");
const context = require.context("./context", false, /\.js$/);

it("should account for every request sharing an external module", () => {
	expect(first).toBe(second);
	expect(path).toBe(first);
	expect(typeof first.join).toBe("function");
	expect(context("./first.js")).toBe(first);
	expect(context("./second.js")).toBe(first);
	expect(__STATS__.hints).toHaveLength(0);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
