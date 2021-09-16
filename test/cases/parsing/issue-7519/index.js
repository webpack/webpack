import {
	count,
	mult,
	inc,
	multUsed,
	incUsed
} from "./a";

it("simple logical expression should work", () => {
	inc() && true && false && mult(2);
	expect(count).toBe(2);
	inc() && false && mult(2);
	expect(count).toBe(3);
	true && inc() && false && mult(2);
	expect(count).toBe(4);
});

it("mult should not be used", () => {
	if (inc() && true && false) {
		mult(2);
	}

	expect(multUsed).toBe(false);
});
