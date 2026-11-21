"use strict";

module.exports = [
	[
		/Asset "linked\/file\.txt" is not emitted because it would be written outside of output\.path .*[\\/]denied[\\/]dist\)/
	],
	[
		/Asset "\.\.\/elsewhere\/link\/file\.txt" is not emitted because it would be written outside of output\.path .*[\\/]allowed-link[\\/]dist\)/
	]
];
