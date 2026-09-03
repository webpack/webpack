const values = require("./context");
const step = require("./trigger");

it("should resolve the context's children with the issuer's rule resolve options on every build", () => {
	expect(step).toBe(WATCH_STEP);
	expect(values).toEqual(["a-alt", "b"]);
});
