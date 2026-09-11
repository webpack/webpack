import { FROM_STABLE } from "./stable";
import { FROM_OTHER } from "./other";

// stable.js never changes, so it stays cached while the mangled property name
// it reads can move as the other consumer's usage changes.
it("should follow a mangled export name that moved under a cached reader", () => {
	expect(FROM_STABLE).toBe("beta");
	expect(FROM_OTHER).toBe(Number(WATCH_STEP) === 1 ? "gamma" : "alpha-gamma");
});
