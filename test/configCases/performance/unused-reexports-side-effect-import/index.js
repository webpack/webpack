// Wanted for its side effect, and re-exported by the barrel as well.
import "./shared";
import { other } from "./barrel";

it("should stay silent when an importer wants the module itself", () => {
	expect(other).toBe(2);
	expect(global.__shared).toBe(true);
	expect(__STATS__.hints).toHaveLength(0);
});
