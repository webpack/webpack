import lib from "./lib";

{
	function require() {}
}

export const viaImport = lib;
export const viaRequire = require("./lib");
