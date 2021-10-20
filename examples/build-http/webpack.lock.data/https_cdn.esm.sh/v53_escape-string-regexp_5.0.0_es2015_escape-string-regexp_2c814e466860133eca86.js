/* esm.sh - esbuild bundle(escape-string-regexp@5.0.0) es2015 production */
function r(e){if(typeof e!="string")throw new TypeError("Expected a string");return e.replace(/[|\\{}()[\]^$+*?.]/g,"\\$&").replace(/-/g,"\\x2d")}export{r as default};
