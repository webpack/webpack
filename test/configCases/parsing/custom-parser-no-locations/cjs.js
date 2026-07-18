exports.answer = "cjs";

if (typeof __nonexistent__ !== "undefined") {
	require.main.require("./module.js");
}
