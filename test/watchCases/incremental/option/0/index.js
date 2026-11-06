import value from "./value";
import stable from "./stable";

it("should update exports with either graph reuse setting", () => {
	expect(value).toBe(Number(WATCH_STEP));
	expect(stable).toBe("stable");
});
