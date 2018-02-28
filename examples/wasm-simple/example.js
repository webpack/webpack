import("./add.wasm").then(addModule => {
	console.log(addModule.add(22, 2200));
	import("./math").then(math => {
		console.log(math.add(10, 101));
		console.log(math.factorial(15));
		console.log(math.factorialJavascript(15));
		console.log(math.fibonacci(15));
		console.log(math.fibonacciJavascript(15));
		timed("wasm factorial", () => math.factorial(1500));
		timed("js factorial", () => math.factorialJavascript(1500));
		timed("wasm fibonacci", () => math.fibonacci(22));
		timed("js fibonacci", () => math.fibonacciJavascript(22));
	});
});

function timed(name, fn) {
	if(!console.time || !console.timeEnd)
		return fn();
	// warmup
	for(var i = 0; i < 10; i++)
		fn();
	console.time(name)
	for(var i = 0; i < 5000; i++)
		fn();
	console.timeEnd(name)
}
