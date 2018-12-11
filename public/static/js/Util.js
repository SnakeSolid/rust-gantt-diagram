"use strict";

define(["d3"], function(d3) {
	const toSortedArray = function(it) {
		return Array.from(it).sort(function(a, b) {
			if (a < b) {
				return -1;
			} else if (a > b) {
				return 1;
			} else {
				return 0;
			}
		});
	};

	const assignIndexes = function(values, callback) {
		const valueColors = [];
		let valueIndex = 0;

		for (const name of toSortedArray(values)) {
			callback(name, valueIndex);

			valueIndex += 1;
		}
	};

	const assignColors = function(values, callback) {
		const allValues = toSortedArray(values);
		let valueIndex = 0;

		for (const name of allValues) {
			const color = d3.hsl((360 * valueIndex) / allValues.length, 1.0, 0.7).hex();

			callback(name, color);

			valueIndex += 1;
		}
	};

	return {
		toSortedArray: toSortedArray,
		assignIndexes: assignIndexes,
		assignColors: assignColors,
	};
});
