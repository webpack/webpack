import { shared } from "./shared";
import other from "./other";

it("should not look at a build with one entrypoint", () => {
	expect(shared).toBe("shared");
	expect(other).toBe("shared");
});
