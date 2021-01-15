import * as Q_rsqrt from "./Q_rsqrt.wasm";
import * as testFunction from "./testFunction.wasm";
import * as fact from "./fact.wasm";
import * as popcnt from "./popcnt.wasm";
import * as fastMath from "./fast-math.wasm";
import * as duff from "./duff.wasm";

export function run_Q_rsqrt() {
	const result = Q_rsqrt._Z7Q_rsqrtf(1/1764);
	expect(result).toBeGreaterThan(41.9);
	expect(result).toBeLessThan(42.1);
}

export function run_testFunction() {
	const view = new Int32Array(testFunction.memory.buffer);
	view[0] = 123;
	view[1] = 1;
	view[2] = 2;
	view[3] = 3;
	const result = testFunction._Z12testFunctionPii(4, 3);
	expect(result).toEqual(6);
}

export function run_fact() {
	const result = fact._Z4facti(11);
	expect(result).toEqual(39916800);
}

export function run_popcnt() {
	expect(popcnt.main(0xF0F)).toEqual(16);
	expect(popcnt._Z5countj(0xF0F)).toEqual(8);
}

export function run_fastMath() {
	expect(fastMath._Z3food(42)).toEqual(14);
	expect(fastMath._Z9maybe_mindd(42, 24)).toEqual(24);
	expect(fastMath._Z8call_powd(42)).toEqual(9682651996416);
	expect(fastMath._Z6do_powd(42)).toEqual(9682651996416);
	expect(fastMath._Z6factorddd(42, 42, 42)).toEqual(3528);
}

export function run_duff() {
	const view = new Uint8Array(duff.memory.buffer);
	view[0] = 123;
	for(let i = 1; i < 100; i++)
		view[i] = i;
	const result = duff._Z4sendPcS_m(200, 1, 100);
	for(let i = 1; i < 100; i++)
		expect(view[199 + i]).toEqual(i);
}
