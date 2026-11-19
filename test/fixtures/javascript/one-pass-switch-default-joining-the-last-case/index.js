var log = [];
function test(name) {
	log.push(name);
	return name;
}
function joins(foo) {
	var x = 1;
	switch (foo) {
		case 0:
		default:
		case x--:
			console.log("joins", foo, x);
	}
}
function empty(foo) {
	var x = 1;
	switch (foo) {
		case 0:
		default:
		case x--:
	}
	console.log("empty", foo, x);
}
function shared(foo) {
	switch (foo) {
		case test("a"):
			console.log("shared", foo);
			break;
		default:
			console.log("shared", foo);
			break;
		case test("b"):
			console.log("shared", foo);
			break;
	}
}
function nested(flag, foo) {
	if (flag)
		switch (foo) {
			case test("c"):
			default:
				console.log("nested", foo);
				break;
		}
	else console.log("not nested");
}
function labeled(foo) {
	out: switch (foo) {
		case test("d"):
		default:
			console.log("labeled", foo);
			break out;
	}
}
function breaks(foo) {
	switch (foo) {
		case test("e"):
		default:
			if (foo > 1) break;
			console.log("breaks", foo);
	}
}
for (var i = 0; i < 3; i++) {
	joins(i);
	empty(i);
	shared(i ? "b" : "a");
	nested(i, "c");
	labeled(i);
	breaks(i);
}
console.log(log.join());
