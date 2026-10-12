const choice = require("./choice");
const tick = require("./tick");
it("should resolve a newly created file before a directory", () => {
 expect(tick).toBe(Math.min(Number(WATCH_STEP), 3));
 expect(choice).toBe(WATCH_STEP === "1" || WATCH_STEP === "4" ? "file" : "directory");
});
