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
function escaped() {
	"\x75se custom";
	return 2;
}
console.log(escaped());
