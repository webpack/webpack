it("should be able to create two modules from loader", function() {
	return import("./wrapper-loader!./src/wasm.dat").then(function(wasm) {
		expect(wasm.getString()).toEqual("Hello World");
	});
});

it("should be able to create two modules from loader with remaining request", function() {
	return import("./wrapper-loader2!./src/wasm.dat?2").then(function(wasm) {
		expect(wasm.getString()).toEqual("Hello World");
	});
});
