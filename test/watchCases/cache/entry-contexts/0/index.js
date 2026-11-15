const state = require("./state");
const tick = require("./tick");
it("should retain both entry contexts", () => {
 expect(tick).toBe(Number(WATCH_STEP));
 expect(state).toEqual(WATCH_STEP === "2" ? ["changed A", "changed B"] : ["A", "B"]);
});
