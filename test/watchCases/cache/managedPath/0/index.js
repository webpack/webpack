import { foo, bar } from "foo";

it("should have the correct values", () => {
	expect(foo).toBe("foo");
	expect(bar).toBe("bar");
});
