import file from "./file-1.js";
import file2 from "./file-2.js";

async function test() {
	const a = 1;
	const b = 2;
	const c = 3;
	const d = 4;
	const f = 5;
	const e = 6;

	await import(/* webpackMode: "eager" */"./async.js");
	await import(/* webpackMode: "eager" */"./file-3.js");

	return a + b + c + d + f + e;
}

test();

export { test, file, file2 }
export default function foo() {
	return "test";
}

test();
