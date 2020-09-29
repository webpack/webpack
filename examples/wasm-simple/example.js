import { add } from "./add.wasm";
import {
	add as mathAdd,
	factorial,
	factorialJavascript,
	fibonacci,
	fibonacciJavascript
} from "./math";

console.log(add(22, 2200));
console.log(mathAdd(10, 101));
console.log(factorial(15));
console.log(factorialJavascript(15));
console.log(fibonacci(15));
console.log(fibonacciJavascript(15));
timed("wasm factorial", () => factorial(1500));
timed("js factorial", () => factorialJavascript(1500));
timed("wasm fibonacci", () => fibonacci(22));
timed("js fibonacci", () => fibonacciJavascript(22));

function timed(name, fn) {
	if (!console.time || !console.timeEnd) return fn();
	// warmup
	for (var i = 0; i < 10; i++) fn();
	console.time(name);
	for (var i = 0; i < 5000; i++) fn();
	console.timeEnd(name);
}
