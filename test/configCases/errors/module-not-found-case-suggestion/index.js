var never = false;

it("should point at the file a request only differs in casing from", function () {
	if (never) {
		require("./button.js");
		require("./button");
	}
});
