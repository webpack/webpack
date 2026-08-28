import { x } from "./a.js";

it("should warn rather than fail the build in a strict harmony module", () => {
	expect(x).toBe(undefined);
});
