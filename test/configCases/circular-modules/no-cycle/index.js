import { a } from "./a";

it("should not mark any module in an acyclic graph as circular", () => {
	expect(a).toBe("ab");
});
