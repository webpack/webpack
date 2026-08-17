import { shared } from "./shared";

it("should load the shared module up front", () => {
	expect(shared).toBe(1);
});
