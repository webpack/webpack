var count = 2;
function down() {
	count-- && down();
}
typeof start == "function" && start();
function start() {
	typeof down == "function" && down();
}
console.log(count);

function written() {
	function replaced() {}
	replaced = 1;
	return typeof replaced;
}
console.log(written());

function shadows(value) {
	function value() {}
	return typeof value;
}
console.log(shadows(1));

function labeled() {
	label: function named() {}
	return typeof named;
}
console.log(labeled());

function hoisted() {
	return typeof later === "function" ? "yes" : "no";
	function later() {}
}
console.log(hoisted());
