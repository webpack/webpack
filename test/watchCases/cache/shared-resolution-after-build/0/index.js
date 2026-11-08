import left from "./left";
import right from "./wrapper";

it("refreshes each request after their shared target has already rebuilt", () => {
	expect(left).toBe("shared");
	expect(right).toBe(["shared", "other", "updated", "shared"][Number(WATCH_STEP)]);
});
