// A declarator nothing reads, set to a call of a function passed for its
// parameter that prints as the literal it returns, leaves nothing behind.
var log = [];
(function (load) {
	var unused = load("lib");
	log.push("ran");
})(function () {
	return {};
});
function setup(load) {
	var unused = load("lib");
	log.push("set up");
}
setup(function () {
	return [];
});
(function (load) {
	var kept = load("lib");
	log.push(typeof kept);
})(function () {
	return {};
});
console.log(log.join());
