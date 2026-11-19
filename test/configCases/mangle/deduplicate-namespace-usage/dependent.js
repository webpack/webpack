import { getFirst, readNested } from "./first.js";
import { getSecond, readConstant } from "./second.js";

it("should preserve namespace escapes in a dependent entry's runtime set", () => {
	const namespace = getFirst();
	expect(getSecond().constant).toBe(42);
	expect(namespace.constant).toBe(42);
	expect(namespace.nested.answer).toBe(readNested());
	expect(namespace.constant).toBe(readConstant());
});
