"use strict";

define(["exports"], function(exports) {
	const KEY_GROUP_MAPPING = "GroupMapping";

	function read(key, defaultValue) {
		const result = localStorage.getItem(key);

		if (result === null) {
			return defaultValue;
		} else {
			return JSON.parse(result);
		}
	}

	function write(key, value) {
		localStorage.setItem(key, JSON.stringify(value));
	}

	function remove(key) {
		localStorage.removeItem(key);
	}

	exports.getGroupMapping = function() {
		return read(KEY_GROUP_MAPPING, {});
	};

	exports.setGroupMapping = function(value) {
		if (value !== undefined) {
			write(KEY_GROUP_MAPPING, value);
		} else {
			remove(KEY_GROUP_MAPPING);
		}
	};
});
