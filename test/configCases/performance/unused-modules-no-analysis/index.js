import "./tracker";
import { value } from "./read";

it("should stay quiet when side effects were never analysed", () => {
	// With 'optimization.sideEffects' off nothing records which statement keeps
	// a module, so there is no attribution to report and the hint says nothing.
	expect(value).toBe(42);
	expect(global.__ANALYTICS__.started).toBe(true);
	expect(__STATS__.warnings).toHaveLength(0);
});
