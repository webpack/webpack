// eslint-disable-next-line no-unused-vars
import { helper } from "./tracker";
import { value } from "./read";

it("should report nothing when hints are off", () => {
	expect(value).toBe(42);
	expect(__STATS__.hints).toHaveLength(0);
	expect(__STATS__.warnings).toHaveLength(0);
});
