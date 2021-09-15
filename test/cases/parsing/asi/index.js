import {a as b, callme, getCount} from "./a";
import * as c from "./b";

function donotcallme() {
	expect("asi unsafe call happened").toBe(false);
}

it("should respect asi flag", () => {
	(donotcallme)
	import.meta;
	(donotcallme)
	b();
	(donotcallme)
	c;

	var i = 0
	for (;i < 10;i++) callme()
	var i = 0
	for (;i < 10;(function() {
		i++
	})()) callme()
	var i = 0
	for (;i < 2;i++) {
		(donotcallme)
		b();
	}
	var i = 0
	if (i++) callme()
	var i = 1
	if (i)
		(donotcallme)
	else
		callme()
	var i = 0
	while (i++ < 4) callme()
	do (donotcallme)
	while (i++ < 4) callme()
	var i = 0
	while (i++ < 4) (function () {
		var i = 4
		return callme()
	})()

	expect(getCount()).toBe(29)
});
