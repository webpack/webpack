import lost from "./lost";
import kept from "./kept";
import plain from "./plain";

it("should report the missing map in stats only", () => {
	expect(lost).toBe(1);
	expect(kept).toBe(2);
	expect(plain).toBe(3);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(
		/missing source maps: 1 module was transformed by a loader that returned no source map/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
