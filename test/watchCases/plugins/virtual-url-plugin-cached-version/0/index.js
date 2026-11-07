import * as stable from "virtual:stable";
import * as changing from "virtual:changing";
import * as unversioned from "virtual:unversioned";
import * as always from "virtual:always";
import tick from "./tick";

it("should reuse virtual modules until their version changes", () => {
	expect({ ...stable }).toEqual({ value: "stable" });
	expect({ ...changing }).toEqual({ value: Number(WATCH_STEP) < 2 ? "first" : "second" });
	expect({ ...unversioned }).toEqual({ value: "unversioned" });
	expect({ ...always }).toEqual({ value: WATCH_STEP });
	expect(tick).toBe(WATCH_STEP);
});
