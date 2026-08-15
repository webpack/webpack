var never = false;

it("should point at the file a request only differs in casing from", function () {
	if (never) {
		// The entry of the request's own directory
		require("./button.js");
		require("./button");
		// A directory the request spells out
		require("./subdir/nested.js");
		require("./subdir/nested");
		// A package name, and a path inside a package
		require("Case-Package");
		require("case-package/Helper.js");
		require("Case-Package/lib/Deep.js");
		// A scope is a directory of the module directory like any other
		require("@Scope/scoped-package");
		require("@scope/Scoped-Package");
		// The query and fragment are carried over to the suggestion
		require("./button.js?raw");
		require("./subdir/nested.js#top");
		// The directory is found by casing, but holds nothing close to the name
		require("./subdir/nothing-like-this-at-all.js");
		// Nothing on disk is close to these under any casing
		require("./no-such-file-at-all.js");
		require("./no-such-directory/button.js");
		require("no-such-package-anywhere");
	}
});
