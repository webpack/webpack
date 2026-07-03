import { local } from "./pkg";

it("should mem-cache the barrel exports while its star target stays deferred", () => {
	expect(local).toBe("local");
});
