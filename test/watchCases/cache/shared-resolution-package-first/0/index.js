const indirect = require("./package");
const direct = require("./package/a.js");
const tick = require("./tick");
it("should resolve each request independently when the package main changes", () => {
 expect(tick).toBe(Number(WATCH_STEP));
 expect([direct, indirect]).toEqual(WATCH_STEP === "1" ? ["A", "B"] : ["A", "A"]);
});
