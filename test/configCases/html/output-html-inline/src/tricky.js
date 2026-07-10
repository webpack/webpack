import "./tricky.css";

// Exercises the script-data escaped + double-escaped states: `<!--` opens the
// escaped state and a following `<script` would hide the wrapper's real close.
console.log("<!-- <script> alert(1) </script> -->");
console.log("</script><span>leak</span>");
window.__INLINE_MARKER__ = 42;
