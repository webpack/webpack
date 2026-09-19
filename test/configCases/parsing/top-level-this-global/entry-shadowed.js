require("./shadowed-tdz");

var globalThis = { shadowed: true };
var realGlobal = require("./real-global");

this.fromShadowed = "global";

it("should not read a globalThis the module declares itself", () => {
	expect(globalThis.shadowed).toBe(true);
	expect(globalThis.fromShadowed).toBe(undefined);
	expect(realGlobal.fromShadowed).toBe("global");
});
