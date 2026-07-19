exports.ok = true;

if (typeof __nonexistent__ !== "undefined") {
	require = function () {};
}
