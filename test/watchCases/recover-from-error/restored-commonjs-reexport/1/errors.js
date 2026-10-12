"use strict";

const errors = ["name-dep", "whole-dep"].map((request) => [
	/Module not found/,
	new RegExp(`Can't resolve '\\./${request}'`)
]);

module.exports = [...errors, ...errors];
