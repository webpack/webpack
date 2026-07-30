import { value as keep } from "./keep";

it("should rebuild a file that was deleted and re-created", () => {
	expect(keep).toBe("keep");
});
