import "./cases/cjs"
import "./cases/esm/auto"
import {b} from "./cases/track/a"
import "./cases/auto/auto"

it("should compile and run the test", () => {
	expect(b).toBe(1);
});
