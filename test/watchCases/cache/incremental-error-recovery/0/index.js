it("should recover with a fresh graph", () => {
 if (WATCH_STEP === "1") {
  expect(() => require("./value")).toThrow(/Module parse failed/);
 } else if (WATCH_STEP === "4") {
  expect(() => require("./value")).toThrow(/Cannot find module/);
 } else {
  expect(require("./value").value).toBe(Number(WATCH_STEP) || 1);
 }
});
