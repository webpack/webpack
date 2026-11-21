try {
					fgh.sub;
					fgh;

					// @ts-expect-error
					function test(ttt) {
						fgh.sub;
						fgh;
					}
				} catch (err) {
					fgh.sub;
					fgh;
				}