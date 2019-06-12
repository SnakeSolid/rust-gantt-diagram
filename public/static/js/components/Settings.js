"use strict";

define(["knockout", "Storage"], function(ko, Storage) {
	function compareGroupsNames(a, b) {
		if (a.fromName < b.fromName) {
			return -1;
		} else if (a.fromName > b.fromName) {
			return 1;
		} else {
			return 0;
		}
	}

	const Settings = function(params) {
		this.groupMapping = ko.observableArray();
		this.editGroupFromName = ko.observable();
		this.editGroupToName = ko.observable();

		this.removePattern = function(item) {
			this.groupMapping.remove(item);
		}.bind(this);

		this.updateGroupMappings();
	};

	Settings.prototype.updateGroupMappings = function() {
		const mappings = Storage.getGroupMapping();
		const groupMapping = Object.keys(mappings).map(function(key) {
			return {
				fromName: key,
				toName: mappings[key],
			};
		});

		groupMapping.sort(compareGroupsNames);

		this.groupMapping(groupMapping);
	};

	Settings.prototype.addPattern = function() {
		const groupMapping = this.groupMapping();
		const fromName = this.editGroupFromName();
		const toName = this.editGroupToName();
		let nameExists = false;

		for (const item of groupMapping) {
			if (item.fromName === fromName) {
				item.toName = toName;
				nameExists = true;

				break;
			}
		}

		if (!nameExists) {
			groupMapping.push({
				fromName: fromName,
				toName: toName,
			});
			groupMapping.sort(compareGroupsNames);
		}

		this.groupMapping(groupMapping);
	};

	Settings.prototype.saveSettings = function() {
		const mappings = this.groupMapping().reduce(function(acc, item) {
			acc[item.fromName] = item.toName;

			return acc;
		}, {});

		Storage.setGroupMapping(mappings);
	};

	return Settings;
});
