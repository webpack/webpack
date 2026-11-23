var count = 0;
function step() {
	return ++count;
}
for (
	;
	(function () {
		console.log("for test", count);
	})();

)
	break;
while (
	(function () {
		console.log("while test", step());
		return 1;
	})()
)
	break;
for (
	(function () {
		step();
	})();
	step();

)
	break;
for (
	var i = 0;
	(function () {
		console.log("declared", i);
	})();

)
	break;
function inner() {
	x();
	for (; !step(); ) break;
}
function x() {}
inner();
console.log(count);
