import { shared } from "./shared";

it("should report a module both entrypoints ship", () => {
	expect(shared).toBe("shared");
});
