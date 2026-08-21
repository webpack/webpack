import { used } from "./barrel";
import { loaded } from "./counter";

it("should report equally sized re-exports in a stable order", () => {
	expect(used).toBe("used");
	// Kept in the bundle rather than on `global`, which leaks between suites.
	expect(loaded.sort()).toEqual(["alpha", "zebra"]);
});
