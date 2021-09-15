import { A, B, C1, C2, D1, D2, E1, E2, E3, F, G } from "./test";

export { a, b, c, d };

if (Math.random() > 0.5) {
	var a = () => A;
	let b = () => B;
}

let b;

var c = () => C1;
couldCallExportC();
var c = () => C2;
couldCallExportC();

while (Math.random() > 0.5) {
	let d = () => D1;
}

while (Math.random() > 0.5) {
	var d = () => D2;
}

while (Math.random() > 0.5) {
	let d = () => D1;
}

if (false) {
	E1();
}

export var e = true ? E2 : E3;

export { f, g };

if (true) {
	let inner = () => F;

	var f = () => inner();
}

if (true) {
	const inner = () => G;

	var g = () => inner();
}
