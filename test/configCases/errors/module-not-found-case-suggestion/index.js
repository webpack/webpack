var never = false;

it("should point at the file a request only differs in casing from", function () {
	if (never) {
		require("./button.js");
		require("./button");
		require("./subdir/nested.js");
		require("./subdir/nested");
		require("Case-Package");
		require("case-package/Helper.js");
		require("no-such-package-anywhere");
	}
});
