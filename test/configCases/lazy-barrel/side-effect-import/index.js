import { Dialog, LIB_VERSION } from "./lib";

it("should use the requested lazy-barrel re-export (#21288)", () => {
	expect(LIB_VERSION).toBe("1");
	expect(Dialog()).toBe("dialog");
});
