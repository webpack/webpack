import {
	count,
	mult,
	inc,
	incTruthy,
	setCount,
	multUsed,
	incUsed
} from "./a";

it("logical 'and' should work", () => {
	setCount(1);
	inc() && "true" && 0 && mult(2);
	expect(count).toBe(2);
	inc() && false && mult(2);
	expect(count).toBe(3);
	true && inc() && inc() && false && mult(2);
	/* inc itself returns undefined */
	expect(count).toBe(4);
	true && incTruthy() && incTruthy() && false && mult(2);
	expect(count).toBe(6);
});

it("logical 'or' should work", () => {
	setCount(1);
	false || "" || inc();
	expect(count).toBe(2);
	(0 || "" || inc() || inc()) && false && mult(2);
	expect(count).toBe(4);
});

it("mult should not be used", () => {
	if (inc() && true && false) {
		mult(2);
	}

	expect(multUsed).toBe(false);
});
