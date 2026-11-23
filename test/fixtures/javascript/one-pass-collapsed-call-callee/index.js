var store = {
	read: function (label) {
		console.log("read", label);
		return function () {
			return this === store ? "bound" : "unbound";
		};
	}
};
function second(skip) {
	console.log(
		(function (run) {
			return run();
		})((skip, store.read("second")))
	);
}
second(store);
console.log(store.read("again")());
