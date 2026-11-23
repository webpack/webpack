var list = [1, 2];
console.log(list.join("-"));
function joined(parts) {
	return parts.join();
}
console.log(joined([]));
console.log(
	(function (parts) {
		return parts.join("+") + typeof parts;
	})([3, 4])
);
function later() {
	var kept = ["a"];
	sideEffect();
	return kept.join();
}
function sideEffect() {
	console.log("side");
}
console.log(later());
