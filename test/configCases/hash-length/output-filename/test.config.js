"use strict";

const fs = require("fs");

const findFile = (files, regex) =>
	files.find((file) => {
		if (regex.test(file)) {
			return true;
		}

		return false;
	});

const verifyFilenameLength = (filename, expectedNameLength) => {
	expect(filename).toMatch(new RegExp(`^.{${expectedNameLength}}$`));
};

module.exports = {
	findBundle(i, options) {
		const files = fs.readdirSync(options.output.path);
		const bundleDetects = [
			options.amd.expectedChunkFilenameLength && {
				regex: new RegExp(`^\\d+.bundle${i}`, "i"),
				expectedNameLength: options.amd.expectedChunkFilenameLength
			},
			{
				regex: new RegExp(`^bundle${i}`, "i"),
				expectedNameLength: options.amd.expectedFilenameLength
			}
		].filter(Boolean);

		let bundleDetect;
		let filename;

		for (bundleDetect of bundleDetects) {
			filename = findFile(files, bundleDetect.regex);
			if (!filename) {
				throw new Error(
					`No file found with correct name (regex: ${
						bundleDetect.regex.source
					}, files: ${files.join(", ")})`
				);
			}
			verifyFilenameLength(
				filename.replace(/^\d+\./, "X."),
				bundleDetect.expectedNameLength
			);
		}

		return `./${filename}`;
	},
	afterExecute: () => {
		delete global.webpackChunk;
	}
};
