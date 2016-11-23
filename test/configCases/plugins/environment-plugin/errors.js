module.exports = [
	[/(aaa)/, /resolve 'bbb'/],
	[/(aaa)/, /resolve 'ccc'/],
	[/(aaa)/, /resolve 'ddd'/],
	[/(bbbccc)/, /resolve 'aaa'/],
	[/(bbbccc)/, /resolve 'ddd'/],
	[/(ddd)/, /resolve 'aaa'/],
	[/(ddd)/, /resolve 'bbb'/],
	[/(ddd)/, /resolve 'ccc'/],
	[/(ddd)/, /resolve 'ddd'/],
];
