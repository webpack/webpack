var never = false;

it("should not crash on missing requires", function() {
	if (never) {
		require("./a");
		require("./b");
		require("./c");
		require("./d");
		require("./e");
		require("./f");
		require("./h");
		require("./i");
		require("./j");
		require("./k");
		require("./l");
		require("./m");
		require("./n");
		require("./o");
	}
});
