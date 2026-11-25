// An array only read through members keeps the length it was written with.
function sum() {
	var a = [1, 2, 3],
		r = 0;
	for (var i = 0; i < a.length; i++) r += a[i];
	return r;
}
function pushed() {
	var a = [1, 2, 3];
	a.push(4);
	return a.length;
}
function indexed() {
	var a = [1, 2, 3];
	a[5] = 1;
	return a.length;
}
function cut() {
	var a = [1, 2, 3];
	a.length = 1;
	return a.length;
}
function handed() {
	var a = [1, 2, 3];
	grow(a);
	return a.length;
}
function returned() {
	let a = [1, 2, 3];
	for (let i = 0; i < a.length; i++) a[i]++;
	return a;
}
function spread(b) {
	var a = [1, ...b];
	return a.length;
}
function grow(list) {
	list.push(0);
}
console.log(sum(), pushed(), indexed(), cut(), handed(), returned(), spread([2, 3]));
