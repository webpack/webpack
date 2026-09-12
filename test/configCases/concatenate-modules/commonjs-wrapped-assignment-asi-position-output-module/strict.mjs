// strict ESM: the default import binds to the wrapper accessor directly, so the
// same shapes take the other interop path into the one wrapped module
import formats from "./formats.js"
import * as namespace from "./formats.js"

export function mutate() {
	const log = []

	{
		log.push("assign")
	}
	formats.strict.value = "assigned"

	{
		log.push("compound")
	}
	formats.strict.count += 2

	{
		log.push("update")
	}
	formats.strict.count++

	{
		log.push("computed")
	}
	formats.strict["flag"] = true

	{
		log.push("deep")
	}
	formats.strict.deep.leaf = "reassigned"

	{
		log.push("namespaceAssign")
	}
	namespace.default.strict.deep.leaf = "namespaced"

	return log
}

export function read() {
	return formats.strict
}
