async function getTemplate(templateName) {
	try {
		let template = await import(
			/* webpackFilter: "^(?:[^.]*(?:\\.(?!noimport(?:\\.js)?$))?)*$" */
			`./templates/${templateName}`
		);
		console.log(template);
	} catch(err) {
		console.error("template error");
		return new Error(err);
	}
}

getTemplate("foo");
getTemplate("bar");
getTemplate("baz");
getTemplate("foo.noimport");
getTemplate("bar.noimport");
getTemplate("baz.noimport");

