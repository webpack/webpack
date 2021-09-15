it("Q_rsqrt should work", function() {
	return import("./Q_rsqrt.wasm").then(function(wasm) {
		const result = wasm._Z7Q_rsqrtf(1/1764);
		expect(result).toBeGreaterThan(41.9);
		expect(result).toBeLessThan(42.1);
	});
});

it("testFunction should work", function() {
	return import("./testFunction.wasm").then(function(wasm) {
		const view = new Int32Array(wasm.memory.buffer);
		view[0] = 123;
		view[1] = 1;
		view[2] = 2;
		view[3] = 3;
		const result = wasm._Z12testFunctionPii(4, 3);
		expect(result).toEqual(6);
	});
});

it("fact should work", function() {
	return import("./fact.wasm").then(function(wasm) {
		const result = wasm._Z4facti(11);
		expect(result).toEqual(39916800);
	});
});

it("popcnt should work", function() {
	return import("./popcnt.wasm").then(function(wasm) {
		expect(wasm.main(0xF0F)).toEqual(16);
		expect(wasm._Z5countj(0xF0F)).toEqual(8);
	});
});

it("fast-math should work", function() {
	return import("./fast-math.wasm").then(function(wasm) {
		expect(wasm._Z3food(42)).toEqual(14);
		expect(wasm._Z9maybe_mindd(42, 24)).toEqual(24);
		expect(wasm._Z8call_powd(42)).toEqual(9682651996416);
		expect(wasm._Z6do_powd(42)).toEqual(9682651996416);
		expect(wasm._Z6factorddd(42, 42, 42)).toEqual(3528);
	});
});

it("duff should work", function() {
	return import("./duff.wasm").then(function(wasm) {
		const view = new Uint8Array(wasm.memory.buffer);
		view[0] = 123;
		for(let i = 1; i < 100; i++)
			view[i] = i;
		const result = wasm._Z4sendPcS_m(200, 1, 100);
		for(let i = 1; i < 100; i++)
			expect(view[199 + i]).toEqual(i);
	});
});
