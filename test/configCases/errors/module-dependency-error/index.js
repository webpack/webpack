import { notHere } from "./stub";

it("should report the missing export as a dependency error", () => {
	expect(notHere).toBe(undefined);
});
