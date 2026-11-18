var seen = [];
function id(value) {
	seen.push(value);
	return value;
}
function apart(value) {
	switch (id(value)) {
		case 1:
			console.log("one or three");
			break;
		case 2:
			console.log("two or nine");
			break;
		case 3:
		case 4:
			console.log("one or three");
			break;
		case 9:
			console.log("two or nine");
			break;
		case 5:
		case 6:
			console.log("one or three");
			break;
	}
}
function returns(value) {
	switch (id(value)) {
		case 1:
			return "odd";
		case 2:
			return "even";
		case 3:
			return "odd";
		case 4:
			return "even";
	}
	return "none";
}
function lastWithoutBreak(value) {
	switch (id(value)) {
		case 1:
			console.log("first");
			break;
		case 2:
			console.log("second");
			break;
		case 3:
			console.log("first");
	}
}
function passesOverCall(value, other) {
	switch (id(value)) {
		case 1:
			console.log("same");
			break;
		case id(other):
			console.log("other");
			break;
		case 3:
			console.log("same");
			break;
	}
}
function fallenInto(value) {
	switch (id(value)) {
		case 1:
			console.log("same");
			break;
		case 2:
			console.log("two");
		case 3:
			console.log("same");
			break;
	}
}
for (var i = 0; i < 10; i++) {
	apart(i);
	console.log(returns(i));
	lastWithoutBreak(i);
	passesOverCall(i, 3);
	fallenInto(i);
}
console.log(seen.join());
