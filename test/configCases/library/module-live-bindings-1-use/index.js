import { count, increment, aliased } from "library";

it("should keep live bindings to a module library's entry exports", () => {
	expect(count).toBe(0);
	expect(aliased).toBe(0);
	increment();
	expect(count).toBe(1);
	expect(aliased).toBe(1);
});
