// evaluser is reached first, so its reason group would come first unless the
// tie-break orders the two equally sized groups by name.
import { run } from "./evaluser";

const cjs = require("./cjs");

it("should order equally sized reason groups by name", () => {
	expect(cjs.fromCjs).toBe(1);
	expect(run("1 + 1")).toBe(2);
});
