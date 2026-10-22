// Every position a block scope binds a name from. Each shadows `require` and
// calls it, so a position the AST collector misses turns into a dependency on
// a module that does not exist, and the build fails saying so.

function fromBlock() {
	{
		const require = () => "block";
		return require("./nope");
	}
}

function fromIfConsequent() {
	if (fromIfConsequent) {
		const require = () => "ifConsequent";
		return require("./nope");
	}
	return "";
}

function fromIfAlternate() {
	if (!fromIfAlternate) {
		return "";
	}
	let require = () => "ifAlternate";
	return require("./nope");
}

function fromForBody() {
	for (let index = 0; index < 1; index++) {
		const require = () => "forBody";
		return require("./nope");
	}
	return "";
}

function fromForInBody() {
	for (const key in { key: 1 }) {
		const require = () => "forInBody";
		return require("./nope");
	}
	return "";
}

function fromForOfBody() {
	for (const item of [1]) {
		const require = () => "forOfBody";
		return require("./nope");
	}
	return "";
}

function fromWhileBody() {
	while (fromWhileBody) {
		const require = () => "whileBody";
		return require("./nope");
	}
	return "";
}

function fromDoWhileBody() {
	do {
		const require = () => "doWhileBody";
		return require("./nope");
	} while (false);
}

function fromLabeled() {
	label: {
		const require = () => "labeled";
		return require("./nope");
	}
}

function fromTry() {
	try {
		const require = () => "try";
		return require("./nope");
	} finally {
		// the finally position is covered below
	}
}

function fromCatch() {
	try {
		throw new Error("x");
	} catch (error) {
		const require = () => "catch";
		return require("./nope");
	}
}

function fromFinally() {
	try {
		// eslint-disable-next-line no-useless-return
		return;
	} finally {
		const require = () => "finally";
		// eslint-disable-next-line no-unsafe-finally
		return require("./nope");
	}
}

function fromSwitchConsequent() {
	switch (1) {
		case 1: {
			const require = () => "switchConsequentBlock";
			return require("./nope");
		}
		default:
			return "";
	}
}

function fromSwitchCase() {
	switch (1) {
		case 1:
			// bound by the switch's own scope, not a block of its own
			const require = () => "switchCase";
			return require("./nope");
		default:
			return "";
	}
}

function fromClassDeclaration() {
	class require {
		tag() {
			return "classDeclaration";
		}
	}
	return new require().tag();
}

module.exports = {
	block: fromBlock(),
	ifConsequent: fromIfConsequent(),
	ifAlternate: fromIfAlternate(),
	forBody: fromForBody(),
	forInBody: fromForInBody(),
	forOfBody: fromForOfBody(),
	whileBody: fromWhileBody(),
	doWhileBody: fromDoWhileBody(),
	labeled: fromLabeled(),
	try: fromTry(),
	catch: fromCatch(),
	finally: fromFinally(),
	switchConsequentBlock: fromSwitchConsequent(),
	switchCase: fromSwitchCase(),
	classDeclaration: fromClassDeclaration()
};
