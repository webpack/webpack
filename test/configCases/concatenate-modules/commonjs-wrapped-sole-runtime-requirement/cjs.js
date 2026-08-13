"use strict";

// top-level `this` keeps this module unhoistable, so it takes the wrap path
var extendsImpl = (this && this.extendsImpl) || function () {};

Object.defineProperty(exports, "__esModule", { value: true });
exports.hello = void 0;
function hello() {
	return "hello " + typeof extendsImpl;
}
exports.hello = hello;
