var c = "PASS";
(function (b) {
	switch (0) {
		case 0:
		case (b = 1):
			b && (c = "FAIL");
	}
})();
console.log(c);
function before(b) {
	switch (1) {
		case 0:
			b = 2;
			break;
		case 1:
			console.log(b);
	}
	return b;
}
function fallback(b) {
	switch (3) {
		case 1:
			b = 2;
		default:
			console.log(b);
		case 4:
			b = 9;
	}
	return b;
}
function unknownTest(b, k) {
	switch (2) {
		case k:
			b = 1;
			break;
		case 2:
			b = 3;
	}
	return b;
}
console.log(before(5), fallback(5), unknownTest(5, 2), unknownTest(5, 0));
