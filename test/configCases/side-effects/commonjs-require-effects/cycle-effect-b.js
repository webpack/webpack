"use strict";
var a = require("./cycle-effect-a");
global.cjsRequireEffects.push("cycle-effect-b");
exports.read = () => a;
