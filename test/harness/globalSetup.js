/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const path = require("path");
const { start } = require("../configCases/asset-modules/http-url/server");
const { create } = require("../helpers/browserslistConfigPackages");
const { createClaims } = require("../helpers/testParts");

module.exports = async () => {
	// Trust the self-signed certificate of the lazy-compilation https case, so
	// its client verifies it rather than turning verification off. Read when a
	// worker starts, so it has to be set here, before Jest spawns them.
	process.env.NODE_EXTRA_CA_CERTS = path.resolve(
		__dirname,
		"../hotCases/lazy-compilation/https/cert.pem"
	);

	createClaims();

	// The `http-url` cases fetch from these: one process, alive for the whole run.
	await start();

	return create();
};
