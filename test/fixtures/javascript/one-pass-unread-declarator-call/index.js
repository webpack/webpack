var count = 0;
function step() {
	return ++count;
}
function plain() {
	var unused = (function () {
		count = 1 + count;
	})((count = count + 1));
	return count;
}
console.log(plain());
function passed() {
	var unused = (function (value) {
		step(value);
	})(step());
	return count;
}
console.log(passed());
function kept() {
	var used = (function () {
			step();
		})(),
		other = used;
	return other;
}
console.log(kept());
function guarded() {
	let unused = (function () {
		if (count > 100) return;
		step();
	})();
	return count;
}
console.log(guarded());
function reads(x) {
	var unused = (function () {
		x = 5;
	})();
	return x;
}
console.log(reads(1));
function selfNamed() {
	var unused = (function named() {
		step();
		return named;
	})();
	return count;
}
console.log(selfNamed());
