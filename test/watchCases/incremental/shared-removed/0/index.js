const a = require("./a");
const b = require("./b");
const tick = require("./tick");
it("should remove the shared module from every importer", () => {
 expect(tick).toBe(Number(WATCH_STEP));
 const expected = ["present", "missing", "restored"][Number(WATCH_STEP)];
 expect([a, b]).toEqual([expected, expected]);
});
