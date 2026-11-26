// A strict block's function is bound in the block alone, so one read once moves there.
(function () {
	"use strict";
	if (Math) {
		function log() {
			console.log("once");
		}
		log();
	}
	if (Math) {
		function inner() {
			console.log("inner");
		}
		function outer() {
			inner();
			console.log("outer");
		}
		outer();
	}
	{
		later();
		function later() {
			console.log("hoisted in its block");
		}
	}
	for (var i = 0; i < 2; i++) {
		function each() {
			console.log("each", i);
		}
		each();
	}
	try {
		{
			early();
			let zone = 1;
			function early() {
				console.log(zone);
			}
		}
	} catch (error) {
		console.log(error.name);
	}
	function shadowed() {
		console.log("outer");
	}
	{
		function shadowed() {
			console.log("inner");
		}
		shadowed();
	}
	shadowed();
	{
		function viaEval() {
			return eval("1 + 1");
		}
		console.log(viaEval());
	}
})();
// Sloppy, Annex B also binds it in the function, which stays.
(function () {
	{
		function annex() {
			console.log("annex");
		}
		annex();
	}
	console.log(typeof annex);
})();
