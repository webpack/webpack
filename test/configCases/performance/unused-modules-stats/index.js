// eslint-disable-next-line no-unused-vars
import { helper } from "./tracker";
import { value } from "./read";

it("should report the unused module in stats only", () => {
	expect(value).toBe(42);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(
		/unused modules: 1 module is bundled although nothing uses what they export/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
