import { named } from "./module";
import { named as named2 } from "./esModule";

it("should emit errors", () => {
	expect(named).toBe(undefined);
	expect(named2).toBe(undefined);
});
