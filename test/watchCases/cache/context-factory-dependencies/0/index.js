import tick from "./tick";
const context = require.context("./selected", false, /\.js$/);
it("refreshes the context factory when its dependency changes", () => {
 expect(context("./value.js")).toBe(Number(WATCH_STEP) === 1 || Number(WATCH_STEP) === 2 ? "b" : "a");
});

it("rebuilds when an unrelated dependency changes", () => {
 expect(tick).toBe(Number(WATCH_STEP) >= 2 ? 2 : 0);
});
