function run(foo) {
	switch (foo) {
		case 1:
			console.log("same", foo);
			break;
		default:
			console.log("same", foo);
			break;
		case "qux":
			console.log("same", foo);
			break;
	}
}
function differs(foo) {
	switch (foo) {
		case 1:
			console.log("one", foo);
			break;
		default:
			console.log("other", foo);
	}
}
function fallsThrough(foo) {
	switch (foo) {
		case 1:
			console.log("same", foo);
		default:
			console.log("same", foo);
	}
}
run(1);
run(2);
run("qux");
differs(1);
differs(2);
fallsThrough(1);
fallsThrough(2);
