"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSameCondition = exports.isUndefined = exports.isPlainObject = exports.isFunction = exports.isRegex = void 0;
var flat_1 = require("flat");
function isRegex(o) {
    return o instanceof RegExp;
}
exports.isRegex = isRegex;
// https://stackoverflow.com/a/7356528/228885
function isFunction(functionToCheck) {
    return (functionToCheck && {}.toString.call(functionToCheck) === "[object Function]");
}
exports.isFunction = isFunction;
function isPlainObject(a) {
    if (a === null || Array.isArray(a)) {
        return false;
    }
    return typeof a === "object";
}
exports.isPlainObject = isPlainObject;
function isUndefined(a) {
    return typeof a === "undefined";
}
exports.isUndefined = isUndefined;
/**
 * According to Webpack docs, a "test" should be the following:
 *
 * - A string
 * - A RegExp
 * - A function
 * - An array of conditions (may be nested)
 * - An object of conditions (may be nested)
 *
 * https://webpack.js.org/configuration/module/#condition
 */
function isSameCondition(a, b) {
    var _a, _b;
    if (!a || !b) {
        return a === b;
    }
    if (typeof a === "string" ||
        typeof b === "string" ||
        isRegex(a) ||
        isRegex(b) ||
        isFunction(a) ||
        isFunction(b)) {
        return a.toString() === b.toString();
    }
    var entriesA = Object.entries((0, flat_1.flatten)(a));
    var entriesB = Object.entries((0, flat_1.flatten)(b));
    if (entriesA.length !== entriesB.length) {
        return false;
    }
    for (var i = 0; i < entriesA.length; i++) {
        entriesA[i][0] = entriesA[i][0].replace(/\b\d+\b/g, "[]");
        entriesB[i][0] = entriesB[i][0].replace(/\b\d+\b/g, "[]");
    }
    function cmp(_a, _b) {
        var _c = __read(_a, 2), k1 = _c[0], v1 = _c[1];
        var _d = __read(_b, 2), k2 = _d[0], v2 = _d[1];
        if (k1 < k2)
            return -1;
        if (k1 > k2)
            return 1;
        if (v1 < v2)
            return -1;
        if (v1 > v2)
            return 1;
        return 0;
    }
    entriesA.sort(cmp);
    entriesB.sort(cmp);
    if (entriesA.length !== entriesB.length) {
        return false;
    }
    for (var i = 0; i < entriesA.length; i++) {
        if (entriesA[i][0] !== entriesB[i][0] ||
            ((_a = entriesA[i][1]) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = entriesB[i][1]) === null || _b === void 0 ? void 0 : _b.toString())) {
            return false;
        }
    }
    return true;
}
exports.isSameCondition = isSameCondition;
//# sourceMappingURL=utils.js.map