var should = require("should");

var LoadersList = require("../lib/LoadersList");

describe("LoaderList", function() {
	it('should create LoadersList without any input', function() {
		var loader = new LoadersList();
		(loader.list).should.eql([]);
	});
	it('should create LoadersList with a blank array', function() {
		var loader = new LoadersList([]);
		(loader.list).should.eql([]);
	});
	it('should throw when create LoadersList with an invalid array', function() {
		should.throws(function() {
			var loader = new LoadersList(['dummyString']);
		}, /must be an object or array/);
	});
	it('should create LoadersList with an invalid array', function() {
		should.throws(function() {
			var loader = new LoadersList(['dummyString']);
		}, /must be an object or array/);
	});
	it('should create LoadersList with an valid array', function() {
		var loaders = [{
			test: /\.css$/,
			loader: 'css'
		}];
		var loader = new LoadersList(loaders);
		(loader.list).should.eql(loaders);
	});
	it('should create LoadersList and match with empty array', function() {
		var loader = new LoadersList([]);
		(loader.match('something')).should.eql([]);
	});
	it('should not match with loaders array', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loader: 'css'
		}]);
		(loader.match('something')).should.eql([]);
	});
	it('should match with regex', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should match with string', function() {
		var loader = new LoadersList([{
			test: 'style.css',
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should match with function', function() {
		var loader = new LoadersList([{
			test: function(str) {
				return str === 'style.css';
			},
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should throw if invalid test', function() {
		var loader = new LoadersList([{
			test: {
				invalid: 'test'
			},
			loader: 'css'
		}]);
		should.throws(function() {
			(loader.match('style.css')).should.eql(['css']);
		}, /not a valid test/);
	});
	it('should accept multiple test array that all match', function() {
		var loader = new LoadersList([{
			test: [
				/style.css/,
				/yle.css/
			],
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should accept multiple test array that not all match', function() {
		var loader = new LoadersList([{
			test: [
				/style.css/,
				/something.css/
			],
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql([]);
	});
	it('should not match if include does not match', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			include: /output.css/,
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql([]);
	});
	it('should match if include matches', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			include: /style.css/,
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should not match if exclude matches', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			exclude: /style.css/,
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql([]);
	});
	it('should match if exclude does not match', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			exclude: /output.css/,
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should work if a loader is applied to all files', function() {
		var loader = new LoadersList([{
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql(['css']);
		(loader.match('scripts.js')).should.eql(['css']);
	});
	it('should work with using loader as string', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loader: 'css'
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should work with using loader as array', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loader: ['css']
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should work with using loaders as string', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: 'css'
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should work with using loaders as array', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: ['css']
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should throw if using loaders with non-string or array', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: {
				someObj: true
			}
		}]);
		should.throws(function() {
			(loader.match('style.css')).should.eql(['css']);
		}, /should have one of the fields/)
	});
	it('should work with using loader with inline query', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loader: 'css?modules=1'
		}]);
		(loader.match('style.css')).should.eql(['css?modules=1']);
	});
	it('should work with using loader with string query', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loader: 'css',
			query: 'modules=1'
		}]);
		(loader.match('style.css')).should.eql(['css?modules=1']);
	});
	it('should work with using loader with object query', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loader: 'css',
			query: {
				modules: 1
			}
		}]);
		(loader.match('style.css')).should.eql(['css?{"modules":1}']);
	});
	it('should work with using array loaders with basic object notation', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: [{
				loader: 'css'
			}]
		}]);
		(loader.match('style.css')).should.eql(['css']);
	});
	it('should throw if using array loaders with object notation without specifying a loader', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: [{
				stuff: 1
			}]
		}]);
		should.throws(function() {
			(loader.match('style.css')).should.eql(['css']);
		}, /should have a 'loader' specified/)
	});
	it('should work with using array loaders with object notation', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: [{
				loader: 'css',
				query: 'modules=1'
			}]
		}]);
		(loader.match('style.css')).should.eql(['css?modules=1']);
	});
	it('should work with using multiple array loaders with object notation', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: [{
				loader: 'style',
				query: 'filesize=1000'
			}, {
				loader: 'css',
				query: 'modules=1'
			}]
		}]);
		(loader.match('style.css')).should.eql(['style?filesize=1000', 'css?modules=1']);
	});
	it('should work with using string multiple loaders', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: 'style?filesize=1000!css?modules=1'
		}]);
		(loader.match('style.css')).should.eql(['style?filesize=1000', 'css?modules=1']);
	});
	it('should throw if using array loaders with a single legacy', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: ['style-loader', 'css-loader'],
			query: 'modules=1'
		}]);
		should.throws(function() {
			(loader.match('style.css')).should.eql(['css']);
		}, /Cannot define 'query' and multiple loaders in loaders list/)
	});
	it('should throw if using array loaders with invalid type', function() {
		var loader = new LoadersList([{
			test: /\.css$/,
			loaders: ['style-loader', 'css-loader', 5],
		}]);
		should.throws(function() {
			(loader.match('style.css')).should.eql(['css']);
		}, /Element from loaders list should be a string or an object/)
	});
});
