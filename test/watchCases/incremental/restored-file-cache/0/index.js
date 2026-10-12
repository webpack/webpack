import { value } from "./branch";
import { stable } from "./stable";

it("should read a restored file after its module was detached", () => {
	expect(value).toBe(Number(WATCH_STEP) + 1);
	expect(stable).toBe(10);
});
