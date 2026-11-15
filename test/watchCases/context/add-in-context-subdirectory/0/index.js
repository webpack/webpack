it("should detect a file added in a subdirectory of a recursive context", function () {
	var context = require.context("./directory", true, /\.js$/);
	expect(context.keys().sort()).toEqual(
		{
			0: ["./a.js", "./sub/b.js"],
			1: ["./a.js", "./sub/b.js", "./sub/c.js"],
			2: ["./a.js", "./d.js", "./sub/b.js", "./sub/c.js"]
		}[WATCH_STEP]
	);
});
