/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */
const r=/^(?:[A-Za-z]:[\\/]|\\\\|\/)/;function e(t,{instancePath:a="",parentData:n,parentDataProperty:o,rootData:s=t}={}){if(!t||"object"!=typeof t||Array.isArray(t))return e.errors=[{params:{type:"object"}}],!1;{const a=0;for(const r in t)if("filename"!==r&&"handle"!==r)return e.errors=[{params:{additionalProperty:r}}],!1;if(0===a){if(void 0!==t.filename){let a=t.filename;const n=0;if(0===n){if("string"!=typeof a)return e.errors=[{params:{type:"string"}}],!1;if(a.includes("!")||!1!==r.test(a))return e.errors=[{params:{}}],!1;if(a.length<1)return e.errors=[{params:{}}],!1}var i=0===n}else i=!0;if(i)if(void 0!==t.handle){const r=0;if(!(t.handle instanceof Function))return e.errors=[{params:{}}],!1;i=0===r}else i=!0}}return e.errors=null,!0}module.exports=e,module.exports.default=e;