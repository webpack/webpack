import { a, b, c, default as d } from "./root";

expect(a()).toBe("a");
if (process.env.NODE_ENV === "production") {
	// These two cases only work correctly when scope hoisted
	expect(b()).toBe("b");
	expect(Object(c).b()).toBe("b");
}
// TODO: Support disable inline export annotation to keep the TDZ
// expect(() => d).toThrow();

export function test() {
	expect(d).toBe(d);
}
