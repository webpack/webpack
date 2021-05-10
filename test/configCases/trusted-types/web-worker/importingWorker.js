// Mock Trusted Types to test if the import (rewritten as importScripts) goes through TT as well.

let policyName = "none";
let scriptURL = "none";

self.trustedTypes = {
	createPolicy: (name, rules) => {
		policyName = name;
		const createScriptURL = rules.createScriptURL;
		rules.createScriptURL = url => {
			scriptURL = url;
			return createScriptURL(url);
		};
		return rules;
	}
};

onmessage = async event => {
	const { upper } = await import("./module");
	postMessage({
		data: upper(event.data),
		policyName,
		scriptURL
	});
};
