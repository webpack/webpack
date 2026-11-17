// A `var` nothing sets, read at most twice, goes: each read is `undefined`.
!(function () {
	console.log(unset === void 0 ? "PASS" : "FAIL");
	var unset;
})();
function read() {
	var none;
	return [typeof none, { none }];
}
console.log(JSON.stringify(read()));
function shorthand() {
	var none;
	return { none };
}
console.log("none" in shorthand());
function deletesNamed() {
	var named;
	return delete (named);
}
console.log(deletesNamed());
// One a `delete` reads, a loop's head declares, a pattern sets or read
// more often stays.
function kept() {
	var deleted, pattern, often;
	[pattern] = [1];
	for (var head; ; ) break;
	return [delete deleted, pattern, head, often, often, often];
}
console.log(kept().join());
try {
	(function () {
		var thrown;
		thrown.x;
	})();
} catch (error) {
	console.log(error instanceof TypeError);
}
