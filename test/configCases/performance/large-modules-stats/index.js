import fat from "./fat";
import a from "./a";
import b from "./b";

it("should report through the stats channel", () => {
	expect(fat.length).toBe(80000);
	expect([a, b]).toHaveLength(2);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(
		/large modules: 1 module carries most of the chunk it is in/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
