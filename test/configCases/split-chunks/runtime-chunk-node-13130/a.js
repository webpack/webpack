import { value } from "./shared?1";

it("should share the instance with the other entry point", () => {
	expect(value).toBe(42);
});
