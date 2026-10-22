// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependencies — the modules must be built, only never executed.
var never = false;

it("should build every module whose loader misbehaves", function () {
	if (never) {
		require("./module-level-throw-loader!./file.js");
		require("./async-error-loader!./file.js");
		require("./irregular-error-loader!./file.js");
		require("./no-return-loader!./file.js");
		require("./pitch-throw-loader!./file.js");
		require("./raw-throw-loader!./file.js");
		require("./missing-loader!./file.js");
		require("json-loader!./not-json.js");
	}
});

it("should keep the result of a loader that only emits diagnostics", function () {
	expect(require("./emit-error-loader!./file.js")).toBe(1);
});

it("should throw the build error when a failed module is executed", function () {
	expect(function () {
		require("./async-error-loader!./file.js");
	}).toThrow(
		"Module build failed (from ./async-error-loader.js):\nError: passed to the async callback"
	);
});
