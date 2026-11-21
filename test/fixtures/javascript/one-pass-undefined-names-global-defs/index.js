// `global_defs` sets the global `undefined`, never a local of that name.
function sample() {
	var undefined;
	console.log(undefined + 1);
}
sample();
console.log(undefined);
// A comparison reads the global as the value `global_defs` gives it.
(function (missing) {
	console.log(missing === undefined, undefined === 7);
})();
