import { shared } from "./shared";
import other from "./other";

it("should stay quiet when one chunk holds the module", () => {
	expect(shared).toBe("shared");
	expect(other).toBe("shared");
});
