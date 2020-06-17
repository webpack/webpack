import d1 from "pck";
const d2 = require("pck");

it("require and import for the same request", () => {
	expect(d1).toBe(2);
	expect(d2).toBe(1);
});
