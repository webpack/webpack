import kept from "./kept";
import plain from "./plain";

it("should report nothing when every loader returned a map", () => {
	expect(kept).toBe(2);
	expect(plain).toBe(3);
	expect(__STATS__.warnings).toHaveLength(0);
});
