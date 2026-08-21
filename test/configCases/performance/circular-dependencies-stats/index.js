import { alpha } from "./alpha";

it("should report through the stats channel", () => {
	expect(alpha()).toBe(2);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(
		/circular dependencies: 1 group of modules imports each other synchronously[\s\S]*\n {2}2 modules: \.\/alpha\.js -> \.\/zebra\.js -> \.\/alpha\.js/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
