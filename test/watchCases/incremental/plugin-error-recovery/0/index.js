import { value } from "./branch";
import { stable } from "./stable";

it("should recover on the same compiler and continue rebuilding", () => {
	const step = Number(WATCH_STEP);
	expect(value).toBe(step + 1);
	expect(stable).toBe(10);
});
