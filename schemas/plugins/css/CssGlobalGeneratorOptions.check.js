/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */
"use strict";function r(t,{instancePath:a="",parentData:e,parentDataProperty:o,rootData:n=t}={}){if(!t||"object"!=typeof t||Array.isArray(t))return r.errors=[{params:{type:"object"}}],!1;{const a=0;for(const a in t)if("exportsOnly"!==a)return r.errors=[{params:{additionalProperty:a}}],!1;if(0===a&&void 0!==t.exportsOnly&&"boolean"!=typeof t.exportsOnly)return r.errors=[{params:{type:"boolean"}}],!1}return r.errors=null,!0}function t(a,{instancePath:e="",parentData:o,parentDataProperty:n,rootData:s=a}={}){let p=null,l=0;return r(a,{instancePath:e,parentData:o,parentDataProperty:n,rootData:s})||(p=null===p?r.errors:p.concat(r.errors),l=p.length),t.errors=p,0===l}module.exports=t,module.exports.default=t;