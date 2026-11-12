import tick from "./tick";
import value from "choice";
it("refreshes the external factory when its dependency changes", () => {
 expect(value).toBe(Number(WATCH_STEP) === 1 || Number(WATCH_STEP) === 2 ? "b" : "a");
});

it("rebuilds when an unrelated dependency changes", () => {
 expect(tick).toBe(Number(WATCH_STEP) >= 2 ? 2 : 0);
});
