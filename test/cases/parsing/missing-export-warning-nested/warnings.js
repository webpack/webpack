module.exports = [
	[
		/export 'A' \(imported as 'm'\) was not found in '.\/a' \(possible exports: a, x\)/
	],
	[
		/export 'x'.'B' \(imported as 'm'\) was not found in '.\/a' \(possible exports: b, y\)/
	],
	[
		/export 'x'.'y'.'C' \(imported as 'm'\) was not found in '.\/a' \(possible exports: Z, c, z\)/
	],
	[
		/export 'x'.'y'.'z'.'D' \(imported as 'm'\) was not found in '.\/a' \(possible exports: default, d\)/
	],
	[
		/export 'x'.'y'.'z'.'v' \(imported as 'm'\) was not found in '.\/a' \(possible exports: default, d\)/
	],
	[
		/export 'p' \(imported as 'm'\) was not found in '.\/a' \(possible exports: a, x\)/
	]
];
