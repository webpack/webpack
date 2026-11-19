// An assignment folds into the object of the member the next statement sets.
function make() {
	return { n: 0 };
}
function set(o, b) {
	o = b;
	o.x = 1;
	return b;
}
function kept(o, b) {
	o = b;
	o.x = 2;
	return o;
}
function keyed(o, k) {
	o = make();
	o[k] += 1;
	return k;
}
function deep(o, b) {
	(o = b), (o.inner.y = 3);
	return b;
}
console.log(make().n, set(1, {}).x, kept(0, {}).x, keyed(null, "n"), deep(0, { inner: {} }).inner.y);
console.log(set(2, {}).x, kept(1, {}).x, keyed(null, "m"), deep(1, { inner: {} }).inner.y);
