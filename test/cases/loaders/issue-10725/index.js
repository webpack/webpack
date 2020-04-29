import { answer } from './lib';

it("should load module correctly", function() {
	var result = require("./text.txt.js!=!./loader.js!./text.txt");

	expect(result.default).toEqual(answer);
});
