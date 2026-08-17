import { a } from "./a";
import { e } from "./e";

it("should warn about both groups, largest first", () => {
	expect(a()).toBe(3);
	expect(e()).toBe(5);
});
