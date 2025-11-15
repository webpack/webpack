import { foo, bar } from "external";

it("should have the correct export for array-style external request (e.g. external: ['./external.mjs', 'inner'])", function () {
	expect(foo).toBe("foo");
	expect(bar).toBe("bar");
});
