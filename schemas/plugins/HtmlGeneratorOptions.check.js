/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */
"use strict";function t(r,{instancePath:e="",parentData:o,parentDataProperty:a,rootData:n=r}={}){let s=null,l=0;if(l==l){if(!r||"object"!=typeof r||Array.isArray(r))return t.errors=[{params:{type:"object"}}],!1;{const e=l;for(const e in r)if("extract"!==e)return t.errors=[{params:{additionalProperty:e}}],!1;if(e===l&&void 0!==r.extract){let e=r.extract;const o=l;let a=!1;const n=l;if("inline"!==e){const t={params:{}};null===s?s=[t]:s.push(t),l++}var i=n===l;if(a=a||i,!a){const t=l;if("boolean"!=typeof e){const t={params:{type:"boolean"}};null===s?s=[t]:s.push(t),l++}i=t===l,a=a||i}if(!a){const r={params:{}};return null===s?s=[r]:s.push(r),l++,t.errors=s,!1}l=o,null!==s&&(o?s.length=o:s=null)}}}return t.errors=s,0===l}module.exports=t,module.exports.default=t;