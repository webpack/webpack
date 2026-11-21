function before() {
	switch (1) {
		case 0:
			var a = true;
			break;
		default:
			if (typeof a === "undefined") console.log("PASS");
			else console.log("FAIL");
	}
}
function matched() {
	switch ("x") {
		case "y":
			var b = 1;
			break;
		case "x":
			console.log(b);
	}
}
function fallsThrough() {
	switch (9) {
		case 1:
			var c = 1;
		default:
			console.log(c);
		case 2:
			var d = 2;
	}
	console.log(c, d);
}
function readTwice() {
	switch (2) {
		default:
			var e = 1;
		case 2:
			console.log(e, e);
	}
}
before();
matched();
fallsThrough();
readTwice();
