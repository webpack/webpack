async function test() {
	const a = 1;
	const b = 2;
	const c = 3;
	const d = 4;
	const f = 5;
	const e = 6;

	await import("./async.js");

	return a + b + c + d + f + e;
}

test();

export { test }
export default test;

test();
