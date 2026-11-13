"use client";
function typeOf(value) {
	"@babel/helpers - typeof";
	return typeof value;
}
console.log(typeOf(1));
function strict() {
	"use custom";
	"use strict";
	return this;
}
console.log(strict());
function asm() {
	"use asm";
	function f() {
		return 1;
	}
	return { f: f };
}
console.log(asm().f());
function escaped() {
	"\x75se custom";
	return 2;
}
console.log(escaped());
