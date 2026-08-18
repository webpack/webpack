import "./polyfill";
import { one } from "./barrel";

it("should stay silent once the modules may be dropped", () => {
	expect(one).toBe("one");
	expect(__STATS__.hints).toHaveLength(0);
});
