const state = require("./state");
const tick = require("./tick");
it("should respect the current entry array order", () => {
 expect(tick).toBe(Number(WATCH_STEP));
 expect(state).toEqual([["A", "B"], ["B", "A"], ["B", "C", "A"], ["A"]][Number(WATCH_STEP)]);
});
