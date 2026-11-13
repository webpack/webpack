var made = (function () {
	return function () {};
})();
var arrow = (() => () => 1)();
console.log(made.name, arrow.name, [(() => () => 1)()][0].name);
