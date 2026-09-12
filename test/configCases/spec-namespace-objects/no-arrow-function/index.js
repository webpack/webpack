import * as ns from "./m.js";

it("should keep names and values without arrow functions", () => {
	expect(Object.getOwnPropertyNames(ns)).toEqual(["a", "b"]);
	expect(ns.a).toBe(1);
	expect(ns.b).toBe(2);
	const missing = "notAnExport";
	expect(ns[missing]).toBe(undefined);
});
