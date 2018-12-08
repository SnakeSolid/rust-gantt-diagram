"use strict";

define([ "knockout", "d3", "Target", "Util", "bindings/GanttChart" ], function(ko, d3, Target, Util, GanttChart) {
	const Chart = function(params) {
		this.items = params.items;
		this.items.subscribe(this.updateGroups.bind(this));

		this.groups = ko.observableArray([]);
		this.selectedItems = ko.observableArray([]);

		this.hasSelectedItems = ko.pureComputed(function() {
			return this.selectedItems().length > 0;
		}, this);
	};

	Chart.prototype.updateGroups = function(rows) {
		const uniqueGroups = new Set();
		const groups = [];

		for (const row of rows) {
			uniqueGroups.add(row.groupName);
		}

		Util.assignColors(uniqueGroups, function(name, color) {
			groups.push({
				name: name,
				color: color,
			});
		});

		this.groups(groups);
	};

	return Chart;
});
