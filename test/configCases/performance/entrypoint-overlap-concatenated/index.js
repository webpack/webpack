import { shared } from "./shared";

it("should see the copy scope hoisting folded into each entrypoint", () => {
	expect(shared).toBe("shared");
});
