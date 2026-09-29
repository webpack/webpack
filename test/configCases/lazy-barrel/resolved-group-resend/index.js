import { fromOther } from "./lib/barrel.js";
import { useLocal } from "./a1.js";
import { useThird } from "./b1.js";

it("should not render an import of a skipped barrel after a later request", () => {
	expect(fromOther).toBe("other");
	expect(useLocal()).toBe("x");
	expect(useThird()).toBe("thirdx");
});
