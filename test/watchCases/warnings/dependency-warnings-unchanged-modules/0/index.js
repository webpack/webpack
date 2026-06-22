import "./dyn";
import { y } from "./module";
import { other } from "./other";

it("should report dependency warnings of unchanged modules on rebuilds", () => {
	expect(y).toBe(WATCH_STEP === "2" ? undefined : 2);
	expect(other).toBe(WATCH_STEP === "0" ? "a" : "b");
});
