import { a, b, c } from "./module";

it("should allow to invalidate and reload a file", () => {
	const oldA = a.value;
	const oldB = b.value;
	const oldC = c.value;
	expect(module.hot.status()).toBe("idle");
	a.invalidate();
	expect(module.hot.status()).toBe("ready");
	b.invalidate();
	expect(module.hot.status()).toBe("ready");
	c.invalidate();
	expect(module.hot.status()).toBe("ready");
	module.hot.apply();
	expect(module.hot.status()).toBe("idle");
	expect(a.value).not.toBe(oldA);
	expect(b.value).not.toBe(oldB);
	expect(c.value).toBe(oldC);
});
