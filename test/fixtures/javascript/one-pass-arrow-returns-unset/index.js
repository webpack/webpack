var undef = function (a) {
	return ((b) => b)();
};
console.log(undef(), undef(), ((c) => c)());
function unset(z) {
	var u;
	return [(() => z)(), (() => u)(), ((v) => v)(z)];
}
console.log(unset(), unset(1));
function setLater() {
	var w;
	var before = (() => w)();
	w = 2;
	return [before, (() => w)()];
}
console.log(setLater());
