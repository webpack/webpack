import lost from "./lost";
import kept from "./kept";
import plain from "./plain";

it("should report nothing when the devtool maps to the loader output anyway", () => {
	expect(lost).toBe(1);
	expect(kept).toBe(2);
	expect(plain).toBe(3);
	expect(__STATS__.warnings).toHaveLength(0);
});
