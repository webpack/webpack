var target,
	n = 0;
function check() {
	return n++ > 0;
}
function arg() {
	return 0;
}
(function (unused) {
	if (check()) return;
	var dead = (target = 1);
	unused;
})(arg());
console.log(target);
