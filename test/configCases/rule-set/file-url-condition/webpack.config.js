"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

/**
 * Builds the file URL of a path below this directory.
 * @param {string} relativePath path relative to this directory
 * @returns {string} a file URL
 */
const fileUrl = (relativePath) =>
	pathToFileURL(path.resolve(__dirname, relativePath)).href;

/**
 * The same URL with the single slash Node's URL parser normalizes to three.
 * @param {string} relativePath path relative to this directory
 * @returns {string} a file URL carrying one slash after the scheme
 */
const shortFileUrl = (relativePath) =>
	`file:${fileUrl(relativePath).slice("file://".length)}`;

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: fileUrl("matched.js"),
				use: { loader: "./loader", options: { marker: "test" } }
			},
			{
				include: fileUrl("directory"),
				use: { loader: "./loader", options: { marker: "include" } }
			},
			{
				test: shortFileUrl("short-url.js"),
				use: { loader: "./loader", options: { marker: "short-url" } }
			}
		]
	}
};
