"use strict";

let count = 0;

exports.bump = function bump() {
	count++;
};

exports.runs = function runs() {
	return count;
};
