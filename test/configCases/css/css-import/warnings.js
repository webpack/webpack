module.exports = [
	/Expected URL in "@import nourl\(test.css\);"/,
	/Expected URL in "@import ;"/,
	/Expected URL in "@import foo-bar;"/,
	/An URL in "@import layer\(super\.foo\) "\.\/style2\.css\?warning=1" supports\(display: flex\) screen and \(min-width: 400px\);" should be before "layer\(\.\.\.\)" or "supports\(\.\.\.\)"/,
	/An URL in "@import layer\(super\.foo\) supports\(display: flex\) "\.\/style2.css\?warning=2" screen and \(min-width: 400px\);" should be before "layer\(\.\.\.\)" or "supports\(\.\.\.\)"/,
	/An URL in "@import layer\(super\.foo\) supports\(display: flex\) screen and \(min-width: 400px\) "\.\/style2.css\?warning=3";" should be before "layer\(\.\.\.\)" or "supports\(\.\.\.\)"/,
	/An URL in "@import layer\(super\.foo\) url\("\.\/style2.css\?warning=4"\) supports\(display: flex\) screen and \(min-width: 400px\);" should be before "layer\(\.\.\.\)" or "supports\(\.\.\.\)"/,
	/An URL in "@import layer\(super\.foo\) supports\(display: flex\) url\("\.\/style2.css\?warning=5"\) screen and \(min-width: 400px\);" should be before "layer\(\.\.\.\)" or "supports\(\.\.\.\)"/,
	/An URL in "@import layer\(super\.foo\) supports\(display: flex\) screen and \(min-width: 400px\) url\("\.\/style2.css\?warning=6"\);" should be before "layer\(\.\.\.\)" or "supports\(\.\.\.\)"/,
	/The "layer\(\.\.\.\)" in "@import url\("\/style2.css\?warning=6"\) supports\(display: flex\) layer\(super.foo\) screen and \(min-width: 400px\);" should be before "supports\(\.\.\.\)"/
];
