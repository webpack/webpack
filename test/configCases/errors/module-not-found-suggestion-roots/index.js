var never = false;

it("should look a rooted request up under 'resolve.roots'", function () {
	if (never) {
		require("/root.js");
		require("/root");
		require("/subdir/nested.js");
		require("/nothing-like-this-at-all.js");
	}
});
