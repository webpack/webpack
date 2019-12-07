const propertyAccess = require("../lib/util/propertyAccess");
describe("util.propertyAccess() test suite", () => {
	describe("given single property", function() {
		it(`should return ".myProp" accessor when ["myProp"]`, () => {
			expect(propertyAccess(["myProp"])).toBe(".myProp");
		});
		it(`should return ["my"Prop"] accessor when "my"Prop"`, () => {
			expect(propertyAccess(['my"Prop'])).toBe('["my\\"Prop"]');
		});
		it(`should return ["0myProp"] accessor when "0myProp"`, () => {
			expect(propertyAccess(["0myProp"])).toBe('["0myProp"]');
		});
		it(`should return "myProp" accessor when "myProp"`, () => {
			expect(propertyAccess("myProp")).toBe(".myProp");
		});
	});
	describe("given property chain", function() {
		it(`should return ".alpha.beta.gamma" accessor when ["alpha", "beta", "gamma"]`, () => {
			expect(propertyAccess(["alpha", "beta", "gamma"])).toBe(
				".alpha.beta.gamma"
			);
		});
		it(`should return ".alpha.beta.gamma" accessor when "alpha/beta/gamma"`, () => {
			expect(propertyAccess("alpha/beta/gamma")).toBe(".alpha.beta.gamma");
		});
		it(`should return '["0alpha"]["be"ta"].gamma' accessor when ["0alpha", "be"ta", "gamma"]`, () => {
			expect(propertyAccess(["0alpha", 'be"ta', "gamma"])).toBe(
				'["0alpha"]["be\\"ta"].gamma'
			);
		});
	});
});
