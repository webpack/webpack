import { A, B } from "./env.js";

it("should not let a value version spell another key's entry", () => {
	expect([A, B]).toEqual(WATCH_STEP === "0" ? ["a1", "b1"] : ["a2", "b2"]);
});
