"use strict";

module.exports = [
	[/Unknown custom media query '--undefined-mq'/],
	[/Custom media query '--defined' must be used in a boolean context/],
	[/Custom media query '--loop' has a value that cannot be resolved/],
	[
		/Custom media query '--tvish' resolves to a media type and can only be used at the start/
	],
	[
		/Custom media query '--parenthesised-type' has a value that cannot be resolved/
	],
	[/Custom media query '--compound' has a value that cannot be resolved/],
	[/Custom media query '--negated' has a value that cannot be resolved/],
	[/Custom media query '--segment' has a value that cannot be resolved/]
];
