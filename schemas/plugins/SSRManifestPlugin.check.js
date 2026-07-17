/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */
const r=/^(?:[A-Za-z]:[\\/]|\\\\|\/)/;function e(t,{instancePath:n="",parentData:a,parentDataProperty:o,rootData:s=t}={}){if(!t||"object"!=typeof t||Array.isArray(t))return e.errors=[{params:{type:"object"}}],!1;{const n=0;for(const r in t)if("context"!==r&&"filename"!==r)return e.errors=[{params:{additionalProperty:r}}],!1;if(0===n){if(void 0!==t.context){let n=t.context;const a=0;if(0===a){if("string"!=typeof n)return e.errors=[{params:{type:"string"}}],!1;if(n.includes("!")||!0!==r.test(n))return e.errors=[{params:{}}],!1}var i=0===a}else i=!0;if(i)if(void 0!==t.filename){let n=t.filename;const a=0;if(0===a){if("string"!=typeof n)return e.errors=[{params:{type:"string"}}],!1;if(n.includes("!")||!1!==r.test(n))return e.errors=[{params:{}}],!1;if(n.length<1)return e.errors=[{params:{}}],!1}i=0===a}else i=!0}}return e.errors=null,!0}module.exports=e,module.exports.default=e;