// A `break` naming the `switch`'s own label leaves it as one of no label.
function single(value) {
	pick: switch (value) {
		case 1:
			console.log("single");
			break pick;
	}
}
function idle(value) {
	outer: inner: switch (value) {
		case 2:
			break inner;
		case 1:
			break outer;
	}
	return "idle";
}
// Past a loop it leaves more than the loop: the label stays.
function looped(value, list) {
	pick: switch (value) {
		case 1:
			for (const item of list) {
				if (item) break pick;
				console.log("item", item);
			}
		case 2:
			console.log("fell", value);
	}
}
function partial(value, flag) {
	pick: switch (value) {
		case 1:
			if (flag) break pick;
			console.log("partial");
			break;
		default:
			console.log("default");
	}
}
single(1);
single(2);
console.log(idle(1));
looped(1, [0, 1]);
looped(1, [0]);
partial(1, true);
partial(1, false);
partial(3);
