import { foo, bar } from "foo";

it("should invalidate when directory gets deleted", () => {
	expect(foo).toBe("foo");
	expect(bar).toBe("bar");
});
