import { alpha } from "./alpha";
import { zebra } from "./zebra";

it("should report both shared modules, ordered by a stable tie-break", () => {
	expect(alpha).toBe("shared alpha");
	expect(zebra).toBe("shared zebra");
});
