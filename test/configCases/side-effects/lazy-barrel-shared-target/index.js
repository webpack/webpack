import { used } from "lib/user.js";
import style from "lib/style.js";

// another importer already requested the barrel's target, so its exports are
// fully known and the name that is really absent must still be reported
it("should report an absent name once the barrel's target was requested", () => {
	expect(used).toBe(1);
	expect(typeof style()).toBe("function");
});
