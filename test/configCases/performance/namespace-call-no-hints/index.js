import * as ns from "./dep";

it("should report a namespace that is called", () => {
	expect(ns.value).toBe(1);
	// The call throws where it runs, so it is only reachable, never reached.
	expect(() => ns()).toThrow();

	expect(__STATS__.hints).toHaveLength(0);
});
