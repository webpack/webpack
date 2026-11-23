var seen = [];
function remember(strings) {
	seen.push(strings);
	return strings;
}
function g() {}
function h() {}
function joined(a, b) {
	if (a) remember`x`;
	else if (b) remember`x`;
}
function alike(a) {
	if (a) remember`x`;
	else remember`x`;
}
function droppedHeads(a) {
	if (a) {
		g();
		remember`x`;
	} else {
		h();
		remember`x`;
	}
}
function exits(a, b) {
	if (a) return remember`x`;
	if (b) return remember`x`;
	return 0;
}
function alikeExits(a) {
	if (a) return remember`x`;
	return remember`x`;
}
function branches(a, b) {
	return a ? remember`x` : b ? remember`x` : 0;
}
function check(name, run) {
	seen = [];
	run(1, 0);
	run(0, 1);
	console.log(name, seen.length, seen[0] === seen[1]);
}
check("joined", joined);
check("alike", alike);
check("droppedHeads", droppedHeads);
check("exits", exits);
check("alikeExits", alikeExits);
check("branches", branches);
