"use strict";

const path = require("path");
const webpack = require("..");
const fs = require("graceful-fs");
const rimraf = require("rimraf");

const tempFolderPath = path.join(__dirname, "TemplateRuntimeTemp");
const tempSourceFilePath = path.join(tempFolderPath, "temp-file.js");
const tempBundleFilePath = path.join(tempFolderPath, "bundle.js");

const createSingleCompiler = () => {
	return webpack({
		entry: tempSourceFilePath,
		context: tempFolderPath,
		mode: "development",
		output: {
			path: tempFolderPath,
			filename: "bundle.js"
		},
		devtool: "inline-cheap-source-map"
	});
};

function cleanup(callback) {
	rimraf(tempFolderPath, callback);
}

function createFiles() {
	fs.mkdirSync(tempFolderPath, { recursive: true });

	fs.writeFileSync(
		tempSourceFilePath,
		`import { SomeClass } from "./somemodule";

const result = new SomeClass();

const a = function test(arg) {
	console.log(arg);
}

if (true) a
SomeClass
`,
		"utf-8"
	);
}

const checkOutputFileStatus = outputFilePath => {
	const result = {
		status: "Ok"
	};
	try {
		if (!fs.existsSync(outputFilePath)) {
			result.status = "CompilerError";
			return result;
		}

		const contentStr = fs.readFileSync(outputFilePath, "utf-8");

		// check syntax
		Function(contentStr);

		return result;
	} catch (e) {
		const error = e.toString();

		result.status = "error";

		if (error.indexOf("SyntaxError") === 0) {
			result.status = "SyntaxError";
			return result;
		}

		result.type = error;
		return result;
	}
};

describe("TemplateRuntimeCheck", () => {
	jest.setTimeout(10000);

	beforeEach(done => {
		cleanup(err => {
			if (err) return done(err);
			createFiles();
			setTimeout(done, 1000);
		});
	});

	afterEach(cleanup);

	it("should build syntax correct code", done => {
		const compiler = createSingleCompiler();
		compiler.run((err, stats) => {
			if (err) throw err;

			compiler.close(err2 => {
				if (err2) throw err2;

				const result = checkOutputFileStatus(tempBundleFilePath);

				expect(result.status).toBe("Ok");

				done();
			});
		});
	});
});
