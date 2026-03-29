// src/app.js  —  used as a <script src> dependency in index.html
console.log("Hello from webpack HTML entry point!");

document.addEventListener("DOMContentLoaded", () => {
	const h1 = document.createElement("h1");
	h1.textContent = "HTML Entry Point Works!";
	document.body.appendChild(h1);
});
