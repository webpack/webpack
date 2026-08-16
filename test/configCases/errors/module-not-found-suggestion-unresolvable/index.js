var never = false;

it("should not offer a suggestion that would fail as well", function () {
	if (never) {
		// The name exists, but it is a directory with nothing to resolve to
		require("./directory-without-indx");
		// 'Legacy.js' is next to it, but 'resolve.restrictions' forbids resolving it
		require("./legacy");
		// The name is right, so the request failed for another reason
		require("./directory-without-index");
	}
});
