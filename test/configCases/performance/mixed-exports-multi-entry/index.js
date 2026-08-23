import { one } from "./first";
import { two } from "./second";

it("should report an entry of several modules only once", () => {
	expect(one + two).toBe(3);
	expect(__STATS__.warnings).toHaveLength(1);
	expect(__STATS__.warnings[0].message).toMatch(/mixed exports: 1 entry exports/);
});
