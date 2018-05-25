// (module
//   (import "./env.js" "n" (global i32))
//   (global (export "value") i32 (get_global 0))
// )

it("should allow global with imported global as initilizer", function() {
	return import("./module.wasm").then(function({value}) {
		expect(value).toEqual(33);
	});
});
