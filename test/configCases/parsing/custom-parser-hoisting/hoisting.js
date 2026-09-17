// Every position a `var` or function declaration hoists from. Each shadows
// `require`, so a position the AST collector misses turns into a dependency
// on a module that does not exist, and the build fails saying so.

function fromBlock() {
	{
		var require = () => "block";
	}
	return require("./nope");
}

function fromIfConsequent() {
	if (fromIfConsequent) var require = () => "ifConsequent";
	return require("./nope");
}

function fromIfAlternate() {
	if (!fromIfAlternate) {
		// eslint-disable-next-line no-empty
	} else {
		var require = () => "ifAlternate";
	}
	return require("./nope");
}

function fromForInit() {
	for (var require = () => "forInit"; false; ) {
		// eslint-disable-next-line no-empty
	}
	return require("./nope");
}

function fromForBody() {
	for (var index = 0; index < 1; index++) var require = () => "forBody";
	return require("./nope");
}

function fromForInLeft() {
	for (var require in { key: 1 }) {
		// eslint-disable-next-line no-empty
	}
	require = () => "forInLeft";
	return require("./nope");
}

function fromForOfBody() {
	for (var entry of [1]) var require = () => "forOfBody";
	return require("./nope");
}

function fromForOfLeft() {
	for (var require of [1]) {
		// eslint-disable-next-line no-empty
	}
	require = () => "forOfLeft";
	return require("./nope");
}

function fromWhile() {
	var count = 0;
	while (count++ < 1) var require = () => "while";
	return require("./nope");
}

function fromDoWhile() {
	do var require = () => "doWhile";
	while (false);
	return require("./nope");
}

function fromLabeled() {
	label: var require = () => "labeled";
	return require("./nope");
}

function fromWith() {
	with ({}) var require = () => "with";
	return require("./nope");
}

function fromTry() {
	try {
		var require = () => "try";
	} catch (error) {
		var fromCatch = 1;
	} finally {
		var fromFinally = 1;
	}
	return require("./nope");
}

function fromCatch() {
	try {
		throw new Error("caught");
	} catch (error) {
		var require = () => "catch";
	}
	return require("./nope");
}

function fromFinally() {
	try {
		// eslint-disable-next-line no-empty
	} finally {
		var require = () => "finally";
	}
	return require("./nope");
}

function fromSwitch() {
	switch (1) {
		case 1:
			var require = () => "switchCase";
			break;
		default:
			var fromDefault = 1;
	}
	return require("./nope");
}

function fromNestedFunctionDeclaration() {
	return declaredLater();
	function declaredLater() {
		return "functionDeclaration";
	}
}

function fromBlockFunctionDeclaration() {
	{
		var require = () => "blockFunction";
		function inBlock() {
			return 1;
		}
	}
	return require("./nope") + (inBlock ? "" : "?");
}

class DeclaredClass {}

module.exports = {
	block: fromBlock(),
	ifConsequent: fromIfConsequent(),
	ifAlternate: fromIfAlternate(),
	forInit: fromForInit(),
	forBody: fromForBody(),
	forInLeft: fromForInLeft(),
	forOfBody: fromForOfBody(),
	forOfLeft: fromForOfLeft(),
	while: fromWhile(),
	doWhile: fromDoWhile(),
	labeled: fromLabeled(),
	with: fromWith(),
	try: fromTry(),
	catch: fromCatch(),
	finally: fromFinally(),
	switchCase: fromSwitch(),
	functionDeclaration: fromNestedFunctionDeclaration(),
	blockFunction: fromBlockFunctionDeclaration(),
	className: DeclaredClass.name
};
