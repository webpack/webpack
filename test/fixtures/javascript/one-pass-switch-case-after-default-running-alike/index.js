var seen = [];
function test(value) {
	seen.push(value);
	return value;
}
function after(value) {
	switch (value) {
		case "bar":
			console.log("bar");
		case "baz":
			console.log("baz");
		default:
		case "qux":
			console.log("other", value);
	}
}
function between(value) {
	switch (value) {
		case 1:
			console.log("one");
		case test(2):
		default:
		case "qux":
			console.log("other", value);
	}
}
function beforeCall(value) {
	switch (value) {
		case 1:
			console.log("one");
			break;
		default:
		case 2:
			console.log("other", value);
			break;
		case test(3):
			console.log("three");
	}
}
var values = ["bar", "baz", "qux", 1, 2, 3, 4];
for (var i = 0; i < values.length; i++) {
	after(values[i]);
	between(values[i]);
	beforeCall(values[i]);
}
console.log(seen.join());
