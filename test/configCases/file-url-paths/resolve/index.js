import answer from "my-module";

it("resolves a bare specifier from a file URL resolve.modules directory", () => {
	expect(answer).toBe(42);
});
