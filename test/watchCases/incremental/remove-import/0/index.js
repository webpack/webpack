it("drops a removed import on incremental rebuild", () => {
	const got = require("./consumer").got;
	if (WATCH_STEP === "0") expect(got).toEqual(["x", "y"]);
	else expect(got).toEqual(["x"]);
});
