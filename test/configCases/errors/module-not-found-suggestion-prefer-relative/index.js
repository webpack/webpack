var never = false;

it("should look next to the origin when 'preferRelative' is set", function () {
	if (never) {
		require("sibling.js");
		require("sibling");
		require("nothing-like-this-at-all");
	}
});
