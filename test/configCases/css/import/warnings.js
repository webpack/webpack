module.exports = [
	/Expected URL in '@import nourl\(test\.css\);'/,
	/Expected URL in '@import ;'/,
	/Expected URL in '@import foo-bar;'/,
	/Expected URL in '@import layer\(super\.foo\) "\.\/style2\.css\?warning=1" supports\(display: flex\) screen and \(min-width: 400px\);'/,
	/Expected URL in '@import layer\(super\.foo\) supports\(display: flex\) "\.\/style2\.css\?warning=2" screen and \(min-width: 400px\);'/,
	/Expected URL in '@import layer\(super\.foo\) supports\(display: flex\) screen and \(min-width: 400px\) "\.\/style2\.css\?warning=3";'/,
	/Expected URL in '@import layer\(super\.foo\) supports\(display: flex\) screen and \(min-width: 400px\) url\("\.\/style2\.css\?warning=6"\);'/,
	/Expected URL in '@import layer\(super\.foo\) supports\(display: flex\) url\("\.\/style2\.css\?warning=5"\) screen and \(min-width: 400px\);'/,
	/Expected URL in '@import layer\(super\.foo\) url\("\.\/style2\.css\?warning=4"\) supports\(display: flex\) screen and \(min-width: 400px\);'/,
	/'@namespace' is not supported in bundled CSS/,
	/Expected URL in '@import layer\(test\) supports\(background: url\("\.\/img\.png"\)\) screen and \(min-width: 400px\);'/,
	/Expected URL in '@import screen and \(min-width: 400px\);'/,
	/Expected URL in '@import supports\(background: url\("\.\/img\.png"\)\) screen and \(min-width: 400px\);'/,
	/Expected URL in '@import supports\(background: url\("\.\/img\.png"\)\);'/,
	/'@namespace' is not supported in bundled CSS/
];
