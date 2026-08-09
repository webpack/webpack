// never true, so the unresolvable request is only a problem if this is parsed
if (module.exports === 42) require("./does-not-exist-a");
module.exports = "a";
