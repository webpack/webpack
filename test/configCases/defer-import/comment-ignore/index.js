it("should compile", async () => {
	// change to other way if webpack in the future rejects require a TLA esm.
	let mod = require("./entry.js");
	expect(mod).toBeInstanceOf(Promise);
	mod = await mod;
	expect(mod.f.val).toBe(1);
});
