"use strict";
const fs = require("fs");
const path = require("path");

module.exports = function checkArrayExpectation(
	testDirectory,
	object,
	kind,
	filename,
	upperCaseKind,
	done
) {
	if (!done) {
		done = upperCaseKind;
		upperCaseKind = filename;
		filename = `${kind}s`;
	}
	let array = object[`${kind}s`].slice().sort();
	if (kind === "warning")
		array = array.filter(item => !/from UglifyJs/.test(item));
	if (fs.existsSync(path.join(testDirectory, `${filename}.js`))) {
		const expectedFilename = path.join(testDirectory, `${filename}.js`);
		const expected = require(expectedFilename);
		if (expected.length < array.length)
			return (
				done(
					new Error(
						`More ${kind}s while compiling than expected:\n\n${array.join(
							"\n\n"
						)}. Check expected warnings: ${filename}`
					)
				),
				true
			);
		else if (expected.length > array.length)
			return (
				done(
					new Error(
						`Less ${kind}s while compiling than expected:\n\n${array.join(
							"\n\n"
						)}. Check expected warnings: ${filename}`
					)
				),
				true
			);
		for (let i = 0; i < array.length; i++) {
			if (Array.isArray(expected[i])) {
				for (let j = 0; j < expected[i].length; j++) {
					if (!expected[i][j].test(array[i]))
						return (
							done(
								new Error(
									`${upperCaseKind} ${i}: ${array[i]} doesn't match ${expected[
										i
									][j].toString()}`
								)
							),
							true
						);
				}
			} else if (!expected[i].test(array[i]))
				return (
					done(
						new Error(
							`${upperCaseKind} ${i}: ${array[i]} doesn't match ${expected[
								i
							].toString()}`
						)
					),
					true
				);
		}
	} else if (array.length > 0) {
		return (
			done(
				new Error(`${upperCaseKind}s while compiling:\n\n${array.join("\n\n")}`)
			),
			true
		);
	}
};
