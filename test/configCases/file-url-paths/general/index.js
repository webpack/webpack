import answer from "./answer";

it("should resolve the entry and imports relative to a file: URL context", () => {
	expect(answer).toBe(42);
});
