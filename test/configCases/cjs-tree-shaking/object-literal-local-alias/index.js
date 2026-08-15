const A = require("./mod.js");

it("should keep module.exports = {…} intact when a local alias captures it", () => {
	expect(A.b()).toBe(true)
});
