import "./polyfill";
import { one } from "./barrel";

it("should stay silent when usage is unknown", () => {
	expect(one).toBe("one");
	expect(__STATS__.hints).toHaveLength(0);
});
