import "./polyfill";
import { one } from "./barrel";

it("unused-reexports-no-hints: should report nothing while hints are off", () => {
	expect(one).toBe("one");
	expect(__STATS__.hints).toHaveLength(0);
});
