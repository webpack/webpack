var never = false;

it("should report a missing module named like an Object.prototype member", function () {
	if (never) {
		require("constructor");
		require("toString");
		require("hasOwnProperty");
	}
});
