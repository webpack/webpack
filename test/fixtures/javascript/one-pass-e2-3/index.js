function pick(flag) {
	if (flag) var seen = false;
	return seen ? "bad" : "ok";
}
function count(flag) {
	if (flag) var seen = false;
	seen = flag;
	return seen ? "set" : "unset";
}
console.log(pick(true), pick(false), count(false));
