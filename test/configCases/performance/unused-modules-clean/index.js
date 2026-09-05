import "./pure";
import { value } from "./read";

it("should report nothing when every bundled module is used or dropped", () => {
	expect(value).toBe(42);
	expect(global.__READ_RAN__).toBe(true);
	expect(__STATS__.warnings).toHaveLength(0);
});
