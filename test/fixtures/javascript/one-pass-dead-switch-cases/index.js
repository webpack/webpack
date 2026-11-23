// A `switch` on a literal never enters a case testing another literal before
// any case that may match: it goes, its `var`s declared before the `switch`.
function foo() {
	return 0;
}
function show(value) {
	console.log(value);
}
function first() {
	switch (1) {
		case 0:
			var x = 1;
		case foo():
			console.log("foo");
		case 1:
			console.log(x);
	}
}
first();
first();
function second(y) {
	switch ("a") {
		case "b":
			if (y) {
				var z = 2;
			}
			console.log("never");
			break;
		case "c":
			y++;
		case foo():
			console.log("zero");
			break;
		default:
			show(y + ":" + z);
	}
}
second(1);
second(2);
function lexical() {
	switch (1) {
		case 0:
			let w = 3;
		case foo():
			break;
		default:
			try {
				w = 4;
			} catch (e) {
				console.log("lexical", e.name);
			}
	}
}
lexical();
lexical();
function caught() {
	try {
		throw 5;
	} catch (e) {
		switch (true) {
			case false:
				var e = 6;
			case foo() > 0:
				break;
			default:
				console.log("caught", e);
		}
	}
}
caught();
caught();
