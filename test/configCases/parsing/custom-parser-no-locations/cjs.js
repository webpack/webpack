exports.answer = "cjs";

if (typeof globalThis.__nonexistent__ !== "undefined") {
	require.main.require("./module.js");
}
