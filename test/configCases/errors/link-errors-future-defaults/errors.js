"use strict";

module.exports = [
	[/conflicting star exports for the name 'x'/],
	// The ambiguous name resolves to nothing, so re-exporting it fails too.
	[/export 'x' \(reexported as 'x'\) was not found in '\.\/amb\.js'/],
	[/is part of a circular reexport chain/],
	[/is part of a circular reexport chain/]
];
