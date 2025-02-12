const ExportHandler = require("../lib/javascript/JavascriptParser");

describe("ExportHandler", () => {
	let handler;
	let mockHooks;

	beforeEach(() => {
		// Setup mock hooks that will be used across tests
		mockHooks = {
			export: jest.fn(),
			exportImport: jest.fn(),
			exportDeclaration: jest.fn(),
			exportSpecifier: jest.fn(),
			exportImportSpecifier: jest.fn(),
			exportExpression: jest.fn()
		};

		handler = new ExportHandler();
		handler.hooks = mockHooks;
	});

	describe("blockPreWalkExportNamedDeclaration", () => {
		test("handles export with source", () => {
			const statement = {
				source: { value: "./source-module" },
				declaration: null,
				specifiers: []
			};

			handler.blockPreWalkExportNamedDeclaration(statement);

			expect(mockHooks.exportImport).toHaveBeenCalledWith(
				statement,
				"./source-module"
			);
		});

		test("handles export with declaration", () => {
			const statement = {
				source: null,
				declaration: {
					type: "VariableDeclaration",
					declarations: [
						{
							type: "VariableDeclarator",
							id: { name: "testVar" }
						}
					]
				},
				specifiers: []
			};

			handler.alreadyExported = jest.fn().mockReturnValue(false);
			handler.preWalkStatement = jest.fn();
			handler.blockPreWalkStatement = jest.fn();
			handler.enterDeclaration = jest.fn((_decl, callback) =>
				callback("testVar")
			);

			handler.blockPreWalkExportNamedDeclaration(statement);

			expect(mockHooks.export).toHaveBeenCalledWith(statement);
			expect(handler.preWalkStatement).toHaveBeenCalledWith(
				statement.declaration
			);
			expect(handler.blockPreWalkStatement).toHaveBeenCalledWith(
				statement.declaration
			);
			expect(mockHooks.exportSpecifier).toHaveBeenCalledWith(
				statement,
				"testVar",
				"testVar",
				0
			);
		});

		test("handles export specifiers", () => {
			const statement = {
				source: null,
				declaration: null,
				specifiers: [
					{
						type: "ExportSpecifier",
						local: { name: "localName" },
						exported: { name: "exportedName" }
					}
				]
			};

			handler.alreadyExported = jest.fn().mockReturnValue(false);

			handler.blockPreWalkExportNamedDeclaration(statement);

			expect(mockHooks.exportSpecifier).toHaveBeenCalledWith(
				statement,
				"localName",
				"exportedName",
				0
			);
		});
	});

	describe("walkExportDefaultDeclaration", () => {
		test("handles named function declaration", () => {
			const statement = {
				declaration: {
					type: "FunctionDeclaration",
					id: { name: "testFunc" }
				}
			};

			handler.walkStatement = jest.fn();

			handler.walkExportDefaultDeclaration(statement);

			expect(mockHooks.export).toHaveBeenCalledWith(statement);
			expect(handler.walkStatement).toHaveBeenCalledWith(statement.declaration);
		});

		test("handles anonymous function expression", () => {
			const statement = {
				declaration: {
					type: "FunctionExpression"
				}
			};

			handler.walkExpression = jest.fn();

			handler.walkExportDefaultDeclaration(statement);

			expect(mockHooks.exportExpression).toHaveBeenCalledWith(
				statement,
				statement.declaration
			);
		});
	});

	describe("blockPreWalkExportAllDeclaration", () => {
		test("handles export * from source", () => {
			const statement = {
				source: { value: "./source-module" },
				exported: null
			};

			handler.blockPreWalkExportAllDeclaration(statement);

			expect(mockHooks.exportImport).toHaveBeenCalledWith(
				statement,
				"./source-module"
			);
			expect(mockHooks.exportImportSpecifier).toHaveBeenCalledWith(
				statement,
				"./source-module",
				null,
				null,
				0
			);
		});

		test("handles export * as name from source", () => {
			const statement = {
				source: { value: "./source-module" },
				exported: { name: "exportedName" }
			};

			handler.blockPreWalkExportAllDeclaration(statement);

			expect(mockHooks.exportImport).toHaveBeenCalledWith(
				statement,
				"./source-module"
			);
			expect(mockHooks.exportImportSpecifier).toHaveBeenCalledWith(
				statement,
				"./source-module",
				null,
				"exportedName",
				0
			);
		});
	});
});
