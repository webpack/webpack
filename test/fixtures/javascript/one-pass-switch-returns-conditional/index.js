// A `switch` whose two cases each return a value returns a `?:` of them.
function name(kind) {
	switch (kind) {
		case "bar":
			return "PASS";
		default:
			return "FAIL";
	}
}
console.log(name("bar"), name("baz"));
function read(kind, value) {
	switch (kind) {
		case value:
			return kind + 1;
		default:
			return kind - 1;
	}
}
console.log(read(1, 1), read(1, 2));
function called(kind) {
	switch (kind) {
		case 1:
			return String(kind);
		default:
			return function () {
				return kind;
			};
	}
}
console.log(called(1), typeof called(2));
