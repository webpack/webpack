"use strict";

module.exports = [
	[
		/a module library may export a stale binding, since the module calls eval\(\), and a function it creates may write a binding later\n {4}\.\/evaluated\.js/
	]
];
