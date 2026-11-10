import value from "./value";
import stable from "./stable";

it("should update exports with every cache setting", () => {
	expect(value).toBe(Number(WATCH_STEP));
	expect(stable).toBe("stable");
});
