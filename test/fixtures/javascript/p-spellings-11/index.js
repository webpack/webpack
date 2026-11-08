var y = 0;
function g() {
	console.log("g");
	return 2;
}
console.log((y++, null) ?? 1, void y++ ?? 1, (y++, null) || g(), void (y, g()) ?? 3, y);
