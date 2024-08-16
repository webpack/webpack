"use strict";

const fs = require("fs");
const path = require("path");
const { lstatReadlinkAbsolute } = require("../lib/util/fs");

jest.mock("fs");

describe("lstatReadlinkAbsolute", () => {
	it("should call the callback with an error if fs.readlink fails", done => {
		// We will mock fs.readlink to always return this error
		const mockError = new Error("Mocked error");

		// Mock fs.lstat to always return a symbolic link
		jest.spyOn(fs, "lstat").mockImplementation((_, callback) => {
			callback(null, { isSymbolicLink: () => true });
		});

		// Mock fs.readlink to always return the error above
		jest.spyOn(fs, "readlink").mockImplementation((_, callback) => {
			callback(mockError);
		});

		const callback = (err, result) => {
			try {
				expect(err).toBe(mockError);
				expect(result).toBeUndefined();
				done();
			} catch (err_) {
				done(err_);
			}
		};

		lstatReadlinkAbsolute(fs, path.resolve("/some/path"), callback);
	});
});
