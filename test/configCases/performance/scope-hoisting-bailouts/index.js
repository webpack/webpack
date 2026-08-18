import { run } from "./evaluser";

const cjs = require("./cjs");

it("should report why modules were left out of a scope", () => {
	expect(cjs.fromCjs).toBe(1);
	expect(run("1 + 1")).toBe(2);
});
