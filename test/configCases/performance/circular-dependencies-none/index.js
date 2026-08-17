import { lazy } from "./lazy";
import { weak } from "./weak";
import { y } from "./cjs";

it("should stay silent for async, weak and self edges", () => {
	expect(y).toBe(2);
	expect(typeof weak()).toBe("boolean");
	expect(typeof lazy().then).toBe("function");
	expect(__STATS__.hints).toHaveLength(0);
});
