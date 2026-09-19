// read before the declaration below, so a bare `globalThis` here would be in
// its temporal dead zone
var captured = this;

const globalThis = { shadowed: true };

it("should not read a globalThis declared after the read", () => {
	expect(globalThis.shadowed).toBe(true);
	// marks the captured object rather than comparing two global objects
	captured.fromTdz = "tdz";
	expect(require("./real-global").fromTdz).toBe("tdz");
});
