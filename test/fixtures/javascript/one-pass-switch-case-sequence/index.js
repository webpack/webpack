var state;
function pick(value) {
	switch (value) {
		case 1:
			console.log("one");
			console.log("still one");
			break;
		default:
			console.log("other");
	}
}
function both(value) {
	switch (value) {
		default:
			state = 0;
			console.log("default", state);
			break;
		case 2:
			state = 2;
			console.log("two", state);
	}
	return state;
}
pick(1);
pick(2);
console.log(both(2), both(3));
