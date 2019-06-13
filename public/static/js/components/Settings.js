"use strict";

define(["knockout", "Storage"], function(ko, Storage) {
	function compareGroupsNames(a, b) {
		if (a.groupName < b.groupName) {
			return -1;
		} else if (a.groupName > b.groupName) {
			return 1;
		} else {
			return 0;
		}
	}

	const Settings = function(params) {
		this.groupMapping = ko.observableArray();
		this.editGroupName = ko.observable();
		this.editRenameTo = ko.observable();

		this.removePattern = function(item) {
			this.groupMapping.remove(item);
		}.bind(this);

		this.updateGroupMappings();
	};

	Settings.prototype.updateGroupMappings = function() {
		const mappings = Storage.getGroupMapping();
		const groupMapping = Object.keys(mappings).map(function(key) {
			return {
				groupName: key,
				renameTo: ko.observable(mappings[key]),
			};
		});

		groupMapping.sort(compareGroupsNames);

		this.groupMapping(groupMapping);
	};

	Settings.prototype.addPattern = function() {
		const groupMapping = this.groupMapping();
		const groupName = this.editGroupName();
		const renameTo = this.editRenameTo();
		let nameExists = false;

		for (const item of groupMapping) {
			if (item.groupName === groupName) {
				item.renameTo(renameTo);
				nameExists = true;

				break;
			}
		}

		if (!nameExists) {
			groupMapping.push({
				groupName: groupName,
				renameTo: ko.observable(renameTo),
			});
			groupMapping.sort(compareGroupsNames);
		}

		this.groupMapping(groupMapping);
	};

	Settings.prototype.saveSettings = function() {
		const mappings = this.groupMapping().reduce(function(acc, item) {
			acc[item.groupName] = item.renameTo();

			return acc;
		}, {});

		Storage.setGroupMapping(mappings);
	};

	return Settings;
});
