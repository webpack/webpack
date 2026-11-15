var Shared;
var seen = Shared || (Shared = { count: 0 });

it("should keep the guard on a script's `var`, which the global object may set", () => {
	expect(seen).toBe(Shared);
});
