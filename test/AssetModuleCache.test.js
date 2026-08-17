"use strict";
require("./helpers/warmup-webpack");
const path = require("path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");

/**
 * Recursively find all files in a directory.
 * @param {string} dir the directory to search
 * @returns {string[]} list of file paths
 */
function findFiles(dir) {
	const results = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...findFiles(fullPath));
		} else {
			results.push(fullPath);
		}
	}
	return results;
}

describe("Asset Module Cache", () => {
	const tempFixturePath = path.join(
		__dirname,
		"fixtures",
		"temp-asset-module-cache-fixture"
	);

	beforeAll(() => {
		rimraf.sync(tempFixturePath);
		fs.mkdirSync(tempFixturePath, { recursive: true });
		fs.mkdirSync(path.join(tempFixturePath, "cache"), { recursive: true });
	});

	afterAll(() => {
		rimraf.sync(tempFixturePath);
	});

	it("should not store binary asset module sources in cache", (done) => {
		const webpack = require("..");
		// Create a large binary file (1MB)
		const binaryContent = Buffer.alloc(1024 * 1024);
		for (let i = 0; i < binaryContent.length; i++) {
			binaryContent[i] = i % 256;
		}
		const binaryPath = path.join(tempFixturePath, "test.bin");
		fs.writeFileSync(binaryPath, binaryContent);

		const entryPath = path.join(tempFixturePath, "entry.js");
		fs.writeFileSync(
			entryPath,
			'import data from "./test.bin"; console.log(data);'
		);

		const options = webpack.config.getNormalizedWebpackOptions({});
		options.cache = {
			type: "filesystem",
			cacheDirectory: path.join(tempFixturePath, "cache"),
			compression: false
		};
		options.entry = entryPath;
		options.context = tempFixturePath;
		options.output.path = path.join(tempFixturePath, "dist");
		options.output.filename = "bundle.js";
		options.module = {
			rules: [
				{
					test: /\.bin$/,
					type: "asset/resource"
				}
			]
		};

		const compiler = webpack(options);
		compiler.run((err, stats) => {
			if (err) return done(err);
			if (stats.hasErrors()) {
				return done(new Error(stats.toString({ errors: true })));
			}
			// Close the compiler to flush the cache
			compiler.close(() => {
				// Now check that the cache doesn't contain the binary content
				const cacheDir = path.join(tempFixturePath, "cache");
				const allFiles = findFiles(cacheDir);

				// Read all cache files and check that the binary content is not stored
				let foundBinaryContent = false;
				for (const file of allFiles) {
					if (file.endsWith(".pack")) {
						const content = fs.readFileSync(file);
						// Check if the binary content (first 1024 bytes pattern) is in the cache
						const pattern = binaryContent.subarray(0, 1024);
						if (content.indexOf(pattern) !== -1) {
							foundBinaryContent = true;
							break;
						}
					}
				}

				if (foundBinaryContent) {
					done(
						new Error("Binary asset source should not be stored in cache")
					);
				} else {
					done();
				}
			});
		});
	});
});
