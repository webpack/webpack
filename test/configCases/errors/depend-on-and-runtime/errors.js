module.exports = [
	[
		/Entrypoint 'b1' has a 'runtime' option which points to another entrypoint named 'a1'/
	],
	[/Entrypoint 'b2' has 'dependOn' and 'runtime' specified/],
	[
		/Entrypoints 'b3' and 'a3' use 'dependOn' to depend on each other in a circular way/
	]
];
