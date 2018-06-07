"use strict";

const path = require("path");
const MemoryFs = require("memory-fs");
const webpack = require("../");

const createMultiCompiler = () => {
	const compiler = webpack([
		{
			context: path.join(__dirname, "fixtures"),
			entry: "./a.js"
		},
		{
			context: path.join(__dirname, "fixtures"),
			entry: "./b.js"
		}
	]);
	compiler.outputFileSystem = new MemoryFs();
	return compiler;
};

describe("ProgressPlugin", function() {
	it("should not contain NaN as a percentage when it is applied to MultiCompiler", function(done) {
		const compiler = createMultiCompiler();

		let percentage = 0;
		new webpack.ProgressPlugin((p, msg, ...args) => {
			percentage += p;
		}).apply(compiler);

		compiler.run(err => {
			if (err) {
				throw err;
			} else {
				expect(percentage).not.toBe(NaN);
				done();
			}
		});
	});
});
