"use strict";

module.exports = [
	[
		/Asset "linked\/file\.txt" is not emitted because it would be written outside of output\.path .*[\\/]denied[\\/]dist\)/
	],
	[
		/Asset "\.\.\/elsewhere\/link\/file\.txt" is not emitted because it would be written outside of output\.path .*[\\/]allowed-link[\\/]dist\)/
	],
	[
		/Asset "linked\/file\.txt" is not emitted because it would be written outside of output\.path .*[\\/]future-defaults[\\/]dist\)/
	],
	[
		/Asset "linked\/file\.txt" is not emitted because it would be written outside of output\.path .*[\\/]emitted-link[\\/]dist\)/
	],
	[
		/Asset "linked\/inner" is not emitted because it would be written outside of output\.path .*[\\/]nested-link[\\/]dist\)/
	],
	[
		/Asset "linked\/file\.txt" is not emitted because it would be written outside of output\.path .*[\\/]nested-link[\\/]dist\)/
	]
];
