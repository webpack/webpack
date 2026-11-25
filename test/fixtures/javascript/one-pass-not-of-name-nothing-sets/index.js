// `!` of a local nothing sets is `true`, and `typeof` of it "undefined".
function test() {
	var bar;
	if (!bar) console.log(1);
	console.log(2);
}
function param(a, b) {
	return [!b, typeof b, !a];
}
function written(c) {
	var bar;
	if (c) bar = 1;
	return !bar;
}
function shadow() {
	var undefined = 1;
	return !undefined;
}
test();
console.log(param(1), written(1), written(0), shadow());
