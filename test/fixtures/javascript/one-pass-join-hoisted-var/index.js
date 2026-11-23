var seven = 7,
	eight = 8;
if (0) {
	var a = 1,
		[x, eight, z] = [2, 3, 4],
		seven = 5;
}
console.log(a, x, eight, z, seven);
function inner() {
	var value = String(3);
	if (false) {
		var unset = 1;
		function hidden() {}
	}
	return [value, unset, typeof hidden];
}
console.log(inner());
