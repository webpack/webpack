function pick(x) {
	var log = [];
	switch (x) {
		case 1:
			log.push("one");
			break;
			log.push("dead");
		default:
			log.push("other");
	}
	return log.join();
}
function only(x) {
	var out = "";
	switch (x) {
		case "bar":
			break;
			out += "dead";
		default:
			out += "other";
	}
	return out;
}
function hoists(x) {
	var out = "";
	switch (x) {
		case 1:
			out += "a";
			break;
			var later = 1;
		default:
			out += later;
	}
	return out;
}
function last(x) {
	var out = "";
	switch (x) {
		case 1:
			out += "a";
			break;
		case 2:
			out += "b";
			break;
			out += "dead";
	}
	return out;
}
console.log(pick(1), pick(2), only("bar"), only(1), hoists(1), hoists(2));
console.log(last(1), last(2), last(3));
