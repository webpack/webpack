"use strict";

const list = [
	[/export 'd' \(imported as 'd'\) was not found in '\.\/star-barrel'/],
	[/export 'a' \(imported as 'a'\) was not found in '\.\/imported'/],
	[/export 'a' \(reexported as 'a'\) was not found in '\.\/reexported'/],
	[/'\.\/star-other' contains conflicting star exports for the name 'd'/],
	[/export 'd' \(imported as 'd'\) was not found in '\.\/walk-x'/],
	[/'\.\/walk-other' contains conflicting star exports for the name 'd'/]
];

module.exports = [...list, ...list];
