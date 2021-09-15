import {
	named1,
	named2,
	named3,
	named4,
	named5,
	named6
} from "./named-with-namespace";

it("should point out conflicts from named to namespace", () => {
	expect(named1).toBe(1);
	expect(named2).toBe(2);
	expect(named3).toBe(2);
	expect(named4).toMatchObject({
		named1: 1,
		named2: 2
	});
	expect(named5).toBe(5);
	expect(named6).toBe(1);
});

import {
	named1 as snamed1,
	named2 as snamed2,
	named3 as snamed3,
	named4 as snamed4,
	named5 as snamed5,
	named6 as snamed6
} from "./named-with-namespace-no-side";

it("should point out conflicts from named to namespace (without sideeffects)", () => {
	expect(snamed1).toBe(1);
	expect(snamed2).toBe(2);
	expect(snamed3).toBe(2);
	expect(snamed4).toMatchObject({
		named1: 1,
		named2: 2
	});
	expect(snamed5).toBe(5);
	expect(snamed6).toBe(1);
});
