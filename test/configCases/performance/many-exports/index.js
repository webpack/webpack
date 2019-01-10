import sum from "./reexport.loader.js!";

it("should compile a module with many harmony exports in acceptable time", function() {
	expect(sum).toBe(499500);
});
