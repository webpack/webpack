import * as ns from "./named-with-namespace";
import {
	named1,
	named2,
	named3,
	named4,
	named5,
	named6
} from "./named-with-namespace";

import * as sns from "./named-with-namespace-no-side";
import {
	named1 as snamed1,
	named2 as snamed2,
	named3 as snamed3,
	named4 as snamed4,
	named5 as snamed5,
	named6 as snamed6
} from "./named-with-namespace-no-side";

// `named1`-`named3` reach different bindings through `a.js` and `b.js`, so they
// are ambiguous; `named4`-`named6` reach the same binding through both.
const expectOmitted = (namespace) => {
	expect("named1" in namespace).toBe(false);
	expect("named2" in namespace).toBe(false);
	expect("named3" in namespace).toBe(false);
	expect("named4" in namespace).toBe(true);
	expect("named5" in namespace).toBe(true);
	expect("named6" in namespace).toBe(true);
};

it("should omit ambiguous star exports from the namespace", () => {
	expectOmitted(ns);
	expect(named1).toBe(undefined);
	expect(named2).toBe(undefined);
	expect(named3).toBe(undefined);
	expect(named4).toMatchObject({
		named1: 1,
		named2: 2
	});
	expect(named5).toBe(5);
	expect(named6).toBe(1);
});

it("should omit ambiguous star exports from the namespace (without side effects)", () => {
	expectOmitted(sns);
	expect(snamed1).toBe(undefined);
	expect(snamed2).toBe(undefined);
	expect(snamed3).toBe(undefined);
	expect(snamed4).toMatchObject({
		named1: 1,
		named2: 2
	});
	expect(snamed5).toBe(5);
	expect(snamed6).toBe(1);
});
