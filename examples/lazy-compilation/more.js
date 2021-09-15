const libraries = {
	"react-dom": () => import("react-dom"),
	"date-fns": () => import("date-fns"),
	xxhashjs: () => import("xxhashjs"),
	"lodash-es": () => import("lodash-es")
};

const pre = document.querySelector("pre");
for (const key of Object.keys(libraries)) {
	const button = document.createElement("button");
	const loadFn = libraries[key];
	button.innerText = key;
	button.onclick = async () => {
		pre.innerText = "Loading " + key + "...";
		const result = await loadFn();
		pre.innerText = `${key} = {\n  ${Object.keys(result).join(",\n  ")}\n}`;
	};
	document.body.appendChild(button);
}

export {};
