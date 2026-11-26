({
	run: async function () {
		console.log("statement");
	}
}).run();

var started = {
	run: function* () {
		console.log("value");
		yield 1;
	}
}.run();
console.log(started.next().value);

({
	x: 1,
	run: function () {
		console.log("this", this.x);
		for (;;) return;
	}
}).run();

({
	run: function () {
		console.log("arguments", arguments.length);
		for (;;) return;
	}
}).run(1, 2);

({
	x: 2,
	run: function () {
		console.log("eval", eval("this.x"));
		for (;;) return;
	}
}).run();

({
	run: async function () {
		console.log("chained");
	}
})
	.run()
	.then(function () {
		console.log("then");
	});
