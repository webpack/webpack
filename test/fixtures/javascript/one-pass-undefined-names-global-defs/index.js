// `global_defs` sets the global `undefined`, never a local of that name.
function sample() {
	var undefined;
	console.log(undefined + 1);
}
sample();
console.log(undefined);
