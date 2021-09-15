import { value, add } from "./live";
import { value as value2, add as add2 } from "./live-es5";
import { getLog } from "./order-tracker";
import "./order-c";
import cycleValue from "./export-cycle-a";
import { data } from "./self-cycle";

it("should establish live binding of values", function() {
	expect(value).toBe(0);
	add(2);
	expect(value).toBe(2);
});

it("should establish live binding of values with transpiled es5 module", function() {
	expect(value2).toBe(0);
	add2(5);
	expect(value2).toBe(5);
});

it("should allow to use eval with exports", function() {
	expect(valueEval).toBe(0);
	evalInModule("value = 5");
	expect(valueEval).toBe(5);
});

it("should execute modules in the correct order", function() {
	expect(getLog()).toEqual(["a", "b", "c"]);
});

it("should bind exports before the module executes", function() {
	expect(cycleValue).toBe(true);
});

it("should allow to import live variables from itself", function() {
	expect(data).toEqual([undefined, 1, 2]);
});

import { value as valueEval, evalInModule } from "./eval";
