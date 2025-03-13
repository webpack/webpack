it("should use JSON.parse", () => {
	const JSONParse = jest.spyOn(JSON, 'parse');
	JSONParse.mockClear();

	const data = require('./data.json');
	const data2 = require('data:application/json,{"this is a large JSON object": "that should be converted to JSON.parse by default"}');
	const data3 = require('./data1.json');

	expect(data).toMatchObject({["123this is a large JSON object"]: "that should be converted to JSON.parse by default"});
	expect(data2).toMatchObject({["this is a large JSON object"]: "that should be converted to JSON.parse by default"});
	expect(data3).toMatchObject([{"this is a large JSON object": "that should be converted to JSON.parse by default"}]);

	expect(JSONParse).toHaveBeenCalledTimes(3);
});

it("should not call JSON.parse when resourceQuery is JSONParse=false", () => {
	const JSONParse = jest.spyOn(JSON, 'parse');
	JSONParse.mockClear();

	const data = require('./data.json?JSONParse=false');

	expect(data).toMatchObject({["123this is a large JSON object"]: "that should be converted to JSON.parse by default"});
	expect(JSONParse).not.toHaveBeenCalled();
});