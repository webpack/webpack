import { value } from './value.js';

const div = document.createElement('div');
div.innerHTML = value
document.body.appendChild(div);

module.hot.accept('./value.js', () => {
	const newValue = require('./value.js').value;
	div.innerHTML = newValue;
})
