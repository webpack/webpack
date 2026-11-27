// A `var` setting nothing declares again a name a function declaration
// declares, before or after it, which it never changes: it goes.
function before() {
	var named;
	function named() {
		return "before";
	}
	return named();
}
function after() {
	function named() {
		return "after";
	}
	var named, other = 1;
	return named() + other;
}
function blocked() {
	{
		function named() {}
	}
	var named;
	return typeof named;
}
function strict() {
	"use strict";
	{
		function named() {}
	}
	var named;
	return typeof named;
}
// One setting a value, or a loop's head, still writes it.
function valued() {
	var named = 1;
	function named() {}
	return named;
}
function looped() {
	for (var named; ; ) break;
	function named() {}
	return typeof named;
}
console.log(before(), after(), blocked(), strict(), valued(), looped());
