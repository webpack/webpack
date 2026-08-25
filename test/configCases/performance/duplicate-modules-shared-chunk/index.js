import { shared } from "./shared";

it("should stay quiet when one chunk holds the shared module", () => {
	expect(shared).toBe("shared");
});
