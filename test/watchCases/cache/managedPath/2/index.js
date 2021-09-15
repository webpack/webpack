import { foo, bar } from "foo";

it("should not invalidate managed item if package version stays equal", () => {
	expect(foo).toBe("foo");
	expect(bar).toBe("inner-bar");
});
