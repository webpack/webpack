// zebra is imported first, so the tie-break is the only thing that can name
// alpha ahead of it.
import { used as zebraUsed } from "zebra";
import { used as alphaUsed } from "alpha";

it("should name equally sized packages in a stable order", () => {
	expect(zebraUsed).toBe(1);
	expect(alphaUsed).toBe(1);
});
