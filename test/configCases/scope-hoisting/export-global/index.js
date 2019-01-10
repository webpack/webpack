import { process as p } from "./module";
import { process as p2 } from "./module2";

it("should export globals correctly", () => {
	expect(p).toBe(42);
	expect(p2).toBe(process);
});
