# literate coffeescript test

Set some `condition` to `true

	condition = true

Create an object with some text

	obj =
		text: "literate coffee test"

Export the text if the condition is true

	module.exports = obj.text if condition?