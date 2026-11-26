var log = [];
function first() {
	return 1;
}
function second() {
	log.push("second");
	return 2;
}
/*#__PURE__*/ (() => first())(second());
second();
console.log(log.join());
