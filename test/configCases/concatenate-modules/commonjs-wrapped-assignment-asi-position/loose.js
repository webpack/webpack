// javascript/auto: the default import reads through the interop accessor, which
// carries an ASI guard of its own that must not end up inside the parentheses
import formats from "./formats"
import { named } from "./formats"
import * as namespace from "./formats"

export function mutate() {
	const log = []

	{
		log.push("assign")
	}
	formats.loose.value = "assigned"

	{
		log.push("compound")
	}
	formats.loose.count += 2

	{
		log.push("update")
	}
	formats.loose.count++

	{
		log.push("computed")
	}
	formats.loose["flag"] = true

	{
		log.push("deep")
	}
	formats.loose.deep.leaf = "reassigned"

	{
		log.push("delete")
	}
	delete formats.loose.gone

	{
		log.push("typeof")
	}
	typeof formats.loose.value

	{
		log.push("void")
	}
	void formats.loose.value

	{
		log.push("call")
	}
	formats.loose.run()

	{
		log.push("new")
	}
	new formats.loose.Ctor()

	{
		log.push("named")
	}
	named()

	{
		log.push("namespaceCall")
	}
	namespace.named()

	{
		log.push("namespace")
	}
	namespace

	{
		log.push("default")
	}
	formats

	return log
}

export function read() {
	return formats.loose
}
