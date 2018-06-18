"use strict";
const processOptions = require("../lib/processOptions");
const SourceMapDevToolPlugin = require("../lib/SourceMapDevToolPlugin");

describe("processOption", () => {
	describe("should set UglifyJS sourceMap", () => {
		const UglifyJsPlugin = require("../lib/optimize/UglifyJsPlugin");
		const mockedArgs = {
			_: [],
			"optimize-minimize": true,
		};
		let options;

		beforeEach(() => {
			options = {
				plugins: [],
				output: {
					filename: "mock"
				},
				entry: {}
			};
		});

		it("to true when SourceMapDevToolPlugin is used", () => {
			options.plugins.push(new SourceMapDevToolPlugin());

			processOptions(options, mockedArgs, {}, false);
			const UglifyJSInstance = options.plugins.find(x => x instanceof UglifyJsPlugin);

			UglifyJSInstance.options.sourceMap.should.be.true();
		});

		it("to true when 'devtool' is set to 'source-map'", () => {
			options.devtool = "source-map";
			processOptions(options, mockedArgs, {}, false);
			const UglifyJSInstance = options.plugins.find(x => x instanceof UglifyJsPlugin);

			UglifyJSInstance.options.sourceMap.should.be.true();
		});

		it("to true when 'devtool' is set to 'sourcemap'", () => {
			options.devtool = "sourcemap";

			processOptions(options, mockedArgs, {}, false);
			const UglifyJSInstance = options.plugins.find(x => x instanceof UglifyJsPlugin);

			UglifyJSInstance.options.sourceMap.should.be.true();
		});

		it("to false when neither 'devtool' option or 'SourceMapDevToolPlugin' is not present", () => {
			processOptions(options, mockedArgs, {}, false);
			const UglifyJSInstance = options.plugins.find(x => x instanceof UglifyJsPlugin);

			UglifyJSInstance.options.sourceMap.should.be.false();
		});
	});
});
