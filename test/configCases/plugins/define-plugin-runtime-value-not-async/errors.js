"use strict";

module.exports = [
	[/DefinePlugin: the runtime value for "ASYNC_DISABLED" returned a Promise/],
	[
		/DefinePlugin: the runtime value for "NOT_DECLARED_ASYNC" returned a Promise, but the generator was not declared asynchronous/
	],
	[
		/DefinePlugin: the runtime value for "REJECTED_NOT_DECLARED_ASYNC" returned a Promise/
	]
];
