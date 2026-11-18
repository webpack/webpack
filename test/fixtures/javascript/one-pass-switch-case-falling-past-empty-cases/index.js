var seen = [];
function test(value) {
	seen.push(value);
	return value;
}
function last(value) {
	switch (value) {
		case test(1):
			console.log("last", value);
			break;
		case test(2):
		case test(3):
			console.log("last", value);
	}
}
function shell(value) {
	switch (value) {
		case test(1):
			console.log("shell", value);
			break;
		case test(2):
		case test(3):
		default:
			console.log("shell", value);
	}
}
function apart(value) {
	switch (value) {
		case 1:
			console.log("apart", value);
			break;
		case test(2):
		case 3:
			console.log("apart", value);
			break;
		case 4:
			console.log("other", value);
			break;
		case 5:
			console.log("apart", value);
			break;
		case test(6):
		case 7:
			console.log("apart", value);
	}
}
for (var i = 0; i < 9; i++) {
	last(i);
	shell(i);
	apart(i);
}
console.log(seen.join());
