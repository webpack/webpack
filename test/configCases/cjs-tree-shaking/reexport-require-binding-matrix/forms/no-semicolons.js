"use strict"

const ns = require("../targets/cjs?no-semicolons")
const before = [1, 2]
exports.whole = ns
exports.member = ns.a
exports.unusedWhole = ns
exports.unusedMember = ns.b
;[0].forEach(() => {})
exports.after = before.length
exports.inUnusedExpression = (exports.unusedInner = ns).c
