import { x } from "./a.js";

it("should fail the build when export presence is an error", () => {
	expect(x).toBe(undefined);
});
