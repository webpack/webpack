"use strict";

// semicolon-free: every require below starts a statement where ASI would join
// the block above it, and each one writes through a parenthesized member access
const log = []

{
	log.push("assign")
}
require("./store").nested.value = "assigned"

{
	log.push("compound")
}
require("./store").nested.count += 2

{
	log.push("update")
}
require("./store").nested.count++

{
	log.push("computed")
}
require("./store").nested["flag"] = true

{
	log.push("deep")
}
require("./store").nested.deep.leaf = "reassigned"

{
	log.push("delete")
}
delete require("./store").nested.gone

{
	log.push("read")
}
require("./store").nested.value

module.exports.report = () => log
module.exports.read = () => require("./store").nested
