function one() {
	console.log("one");
}
function other() {
	console.log("other");
}
var result;
function runs(kind) {
	switch (kind) {
		case 1:
			one();
			break;
		default:
			other();
	}
	console.log("after");
}
function sets(kind) {
	switch (kind) {
		case 1:
			result = "one";
			break;
		default:
			result = "other";
	}
}
runs(1);
runs(2);
sets(1);
console.log(result);
sets(2);
console.log(result);
