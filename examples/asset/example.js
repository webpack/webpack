// There are different ways to use files:

// 1. Using `import something from "./file.ext";`

// return URLs or Data URL, depends on your configuration
import png from "./images/file.png";
import jpg from "./images/file.jpg";
import svg from "./images/file.svg";

// 2. Using `import something from "./file.ext"; with { type: "text" }` or `import something from "./file.ext"; with { type: "bytes" }`
// You don't need extra options in your configuration for these imports, they work out of the box

// returns the content as text
import text from "./content/file.text" with { type: "text" };

// returns the content as `Uint8Array`
import bytes from "./content/bytes.svg" with { type: "bytes" };

// 3. Using `new URL("./file.ext", import.meta.url);`
// You don't need extra options in your configuration for `new URL(...)` construction, they work out of the box
const url = new URL("./images/url.svg", import.meta.url);

const container = document.createElement("div");

Object.assign(container.style, {
	display: "flex",
	flexWrap: "wrap",
	justifyContent: "center"
});
document.body.appendChild(container);

function createImageElement(div, data) {
	const img = document.createElement("img");
	img.setAttribute("src", data);
	img.setAttribute("width", "150");
	div.appendChild(img);

	container.appendChild(div);
}

function createTextElement(div, data) {
	const context = document.createElement("div");
	context.textContent = data;
	div.appendChild(context);

	container.appendChild(div);
}

function createBlobElement(div, data) {
	const blob = new Blob([data], { type: 'image/svg+xml' });
	const blobUrl = URL.createObjectURL(blob);

	const img = document.createElement("img");

	img.setAttribute("src", blobUrl);
	img.setAttribute("width", "150");
	div.appendChild(img);

	container.appendChild(div);

	img.addEventListener(
		'load',
		() => { URL.revokeObjectURL(blobUrl) },
		{ once: true }
	);
}

const files = [
	{
		title: "import png from \"./images/file.png\";",
		data: png,
		render: createImageElement,
	},
	{
		title: "import jpg from \"./images/file.jpg\";",
		data: jpg,
		render: createImageElement,
	},
	{
		title: "import svg from \"./images/file.svg\";",
		data: svg,
		render: createImageElement,
	},
	{
		title: "import text from \"./content/file.text\" with { type: \"text\" };",
		data: text,
		render: createTextElement,
	},
	{
		title: "import bytes from \"./content/file.text\" with { type: \"bytes\" };",
		data: bytes,
		render: createBlobElement,
	},
	{
		title: "new URL(\"./url.svg\", import.meta.url);",
		data: url,
		render: createImageElement,
	},
];


function render(title, data, fn) {
	const div = document.createElement("div");
	div.style.textAlign = "center";
	div.style.width = "50%";

	const h2 = document.createElement("h2");
	h2.textContent = title;
	div.appendChild(h2);

	fn(div, data)
}

files.forEach(item => {
	render(item.title, item.data, item.render);
});
