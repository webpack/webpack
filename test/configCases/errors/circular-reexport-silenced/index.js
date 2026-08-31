import { x } from "./a.js";

it("should report nothing when export presence is turned off", () => {
	expect(x).toBe(undefined);
});
