// Modern source. In a real project the legacy build runs this through a
// transpiling loader (babel/swc) with old `targets`; the modern build ships it
// as-is over `<script type="module">`.
const heading = document.querySelector("h1");
heading?.classList.add("ready");
console.log("app running");
