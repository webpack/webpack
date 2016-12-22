var should = require("should");

var RuleSet = require("../lib/RuleSet");

function match(ruleSet, resource) {
	var result = ruleSet.exec({
		resource: resource
	});
	return result.filter(function(r) {
		return r.type === "use";
	}).map(function(r) {
		return r.value;
	}).map(function(r) {
		if(!r.options)
			return r.loader;
		if(typeof r.options === "string")
			return r.loader + "?" + r.options;
		return r.loader + "?" + JSON.stringify(r.options);
	});
};

describe("RuleSet", function() {
	it('should create RuleSet with a blank array', function() {
		var loader = new RuleSet([]);
		(loader.rules).should.eql([]);
	});
	it('should create RuleSet and match with empty array', function() {
		var loader = new RuleSet([]);
		(match(loader, 'something')).should.eql([]);
	});
	it('should not match with loaders array', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loader: 'css'
		}]);
		(match(loader, 'something')).should.eql([]);
	});
	it('should match with regex', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should match with string', function() {
		var loader = new RuleSet([{
			test: 'style.css',
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should match with function', function() {
		var loader = new RuleSet([{
			test: function(str) {
				return str === 'style.css';
			},
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should throw if invalid test', function() {
		should.throws(function() {
			var loader = new RuleSet([{
				test: {
					invalid: 'test'
				},
				loader: 'css'
			}]);
			(match(loader, 'style.css')).should.eql(['css']);
		}, /Unexcepted property invalid in condition/);
	});
	it('should accept multiple test array that all match', function() {
		var loader = new RuleSet([{
			test: [
				/style.css/,
				/yle.css/
			],
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should accept multiple test array that not all match', function() {
		var loader = new RuleSet([{
			test: [
				/style.css/,
				/something.css/
			],
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should not match if include does not match', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			include: /output.css/,
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql([]);
	});
	it('should match if include matches', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			include: /style.css/,
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should not match if exclude matches', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			exclude: /style.css/,
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql([]);
	});
	it('should match if exclude does not match', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			exclude: /output.css/,
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should work if a loader is applied to all files', function() {
		var loader = new RuleSet([{
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
		(match(loader, 'scripts.js')).should.eql(['css']);
	});
	it('should work with using loader as string', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loader: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should work with using loader as array', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loader: ['css']
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should work with using loaders as string', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loaders: 'css'
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should work with using loaders as array', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loaders: ['css']
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should throw if using loaders with non-string or array', function() {
		should.throws(function() {
			var loader = new RuleSet([{
				test: /\.css$/,
				loaders: {
					someObj: true
				}
			}]);
			(match(loader, 'style.css')).should.eql(['css']);
		}, /No loader specified/)
	});
	it('should work with using loader with inline query', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loader: 'css?modules=1'
		}]);
		(match(loader, 'style.css')).should.eql(['css?modules=1']);
	});
	it('should work with using loader with string query', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loader: 'css',
			query: 'modules=1'
		}]);
		(match(loader, 'style.css')).should.eql(['css?modules=1']);
	});
	it('should work with using loader with object query', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loader: 'css',
			query: {
				modules: 1
			}
		}]);
		(match(loader, 'style.css')).should.eql(['css?{"modules":1}']);
	});
	it('should work with using array loaders with basic object notation', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loaders: [{
				loader: 'css'
			}]
		}]);
		(match(loader, 'style.css')).should.eql(['css']);
	});
	it('should throw if using array loaders with object notation without specifying a loader', function() {
		should.throws(function() {
			var loader = new RuleSet([{
				test: /\.css$/,
				loaders: [{
					stuff: 1
				}]
			}]);
			match(loader, 'style.css');
		}, /No loader specified/)
	});
	it('should work with using array loaders with object notation', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loaders: [{
				loader: 'css',
				query: 'modules=1'
			}]
		}]);
		(match(loader, 'style.css')).should.eql(['css?modules=1']);
	});
	it('should work with using multiple array loaders with object notation', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loaders: [{
				loader: 'style',
				query: 'filesize=1000'
			}, {
				loader: 'css',
				query: 'modules=1'
			}]
		}]);
		(match(loader, 'style.css')).should.eql(['style?filesize=1000', 'css?modules=1']);
	});
	it('should work with using string multiple loaders', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loaders: 'style?filesize=1000!css?modules=1'
		}]);
		(match(loader, 'style.css')).should.eql(['style?filesize=1000', 'css?modules=1']);
	});
	it('should throw if using array loaders with a single legacy', function() {
		should.throws(function() {
			var loader = new RuleSet([{
				test: /\.css$/,
				loaders: ['style-loader', 'css-loader'],
				query: 'modules=1'
			}]);
			(match(loader, 'style.css')).should.eql(['css']);
		}, /options\/query cannot be used with loaders/)
	});
	it('should work when using array loaders', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			loaders: ['style-loader', 'css-loader']
		}]);
		(match(loader, 'style.css')).should.eql(['style-loader', 'css-loader']);
	});
	it('should work when using an array of functions returning a loader', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			use: [
				function(data) {
					return {
						loader: 'style-loader'
					}
				},
				function(data) {
					return {
						loader: 'css-loader'
					}
				},
			]
		}]);
		(match(loader, 'style.css')).should.eql(['style-loader', 'css-loader']);
	});
	it('should work when using an array of either functions or strings returning a loader', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			use: [
				"style-loader",
				function(data) {
					return {
						loader: 'css-loader'
					}
				},
			]
		}]);
		(match(loader, 'style.css')).should.eql(['style-loader', 'css-loader']);
	});
	it('should work when using an array of functions returning either a loader obejct or loader name string', function() {
		var loader = new RuleSet([{
			test: /\.css$/,
			use: [
				function(data) {
					return 'style-loader'
				},
				function(data) {
					return {
						loader: 'css-loader'
					}
				},
			]
		}]);
		(match(loader, 'style.css')).should.eql(['style-loader', 'css-loader']);
	});
	it('should throw if using array loaders with invalid type', function() {
		should.throws(function() {
			var loader = new RuleSet([{
				test: /\.css$/,
				loaders: ['style-loader', 'css-loader', 5],
			}]);
			(match(loader, 'style.css')).should.eql(['css']);
		}, /No loader specified/)
	});
	describe('when exclude array holds an undefined item', function() {
		function errorHasContext(err) {
			if(/Expected condition but got falsy value/.test(err) &&
				/test/.test(err) &&
				/include/.test(err) &&
				/exclude/.test(err) &&
				/node_modules/.test(err) &&
				/undefined/.test(err)) {
				return true;
			}
		}
		it('should throw with context', function() {
			should.throws(function() {
				var loader = new RuleSet([{
					test: /\.css$/,
					loader: 'css',
					include: [
						'src',
					],
					exclude: [
						'node_modules',
						undefined,
					],
				}]);
				(match(loader, 'style.css')).should.eql(['css']);
			}, errorHasContext)
		});
		it('in resource should throw with context', function() {
			should.throws(function() {
				var loader = new RuleSet([{
					resource: {
						test: /\.css$/,
						include: [
							'src',
						],
						exclude: [
							'node_modules',
							undefined,
						],
					},
				}]);
				(match(loader, 'style.css')).should.eql(['css']);
			}, errorHasContext)
		});
		it('in issuer should throw with context', function() {
			should.throws(function() {
				var loader = new RuleSet([{
					issuer: {
						test: /\.css$/,
						include: [
							'src',
						],
						exclude: [
							'node_modules',
							undefined,
						],
					},
				}]);
				(match(loader, 'style.css')).should.eql(['css']);
			}, errorHasContext)
		});
	});
});
