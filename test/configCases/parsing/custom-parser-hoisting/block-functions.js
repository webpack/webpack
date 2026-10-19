function strictOuter() {
	"use strict";
	{
		function require() {}
	}
	return require("./lib");
}

function strictInner() {
	"use strict";
	{
		function require(request) {
			return "local " + request;
		}
		return require("./lib");
	}
}

function sloppyAsync() {
	{
		async function require() {}
	}
	return require("./lib");
}

function sloppyGenerator() {
	{
		function* require() {}
	}
	return require("./lib");
}

function sloppyAnnexB() {
	{
		function require() {
			return "annex b";
		}
	}
	return require("./lib");
}

module.exports = {
	strictOuter: strictOuter(),
	strictInner: strictInner(),
	sloppyAsync: sloppyAsync(),
	sloppyGenerator: sloppyGenerator(),
	sloppyAnnexB: sloppyAnnexB()
};
