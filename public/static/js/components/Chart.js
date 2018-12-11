"use strict";

define(["knockout", "d3", "Target", "Util", "bindings/GanttChart"], function(ko, d3, Target, Util, GanttChart) {
	const Chart = function(params) {
		this.items = params.items;
		this.items.subscribe(this.updateGroups.bind(this));

		this.groups = ko.observableArray([]);
		this.selectedItems = ko.observableArray([]);
		this.groupColors = ko.observable({});

		this.hasItems = ko.pureComputed(function() {
			return this.items().length > 0;
		}, this);

		this.hasSelectedItems = ko.pureComputed(function() {
			return this.selectedItems().length > 0;
		}, this);
	};

	Chart.prototype.groupStyle = function(name) {
		const style = {};

		style["background-color"] = this.groupColors()[name] || "#808080";

		return style;
	};

	Chart.prototype.updateGroups = function(rows) {
		const uniqueGroups = new Set();
		const groups = [];
		const groupColors = {};

		for (const row of rows) {
			uniqueGroups.add(row.groupName);
		}

		Util.assignColors(uniqueGroups, function(name, color) {
			groups.push({
				name: name,
				color: color,
			});
			groupColors[name] = color;
		});

		this.groups(groups);
		this.groupColors = ko.observable(groupColors);
	};

	return Chart;
});
