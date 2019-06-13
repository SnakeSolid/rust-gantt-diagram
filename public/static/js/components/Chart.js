"use strict";

define(["knockout", "moment", "Target", "Util", "bindings/GanttChart"], function(ko, moment, Target, Util, GanttChart) {
	const Chart = function(params) {
		this.items = params.items;
		this.items.subscribe(this.updateGroups.bind(this));

		this.groups = ko.observableArray([]);
		this.selectedItems = ko.observableArray([]);
		this.groupColors = ko.observable({});
		this.duration = ko.observable();

		this.hasItems = ko.pureComputed(function() {
			return this.items().length > 0;
		}, this);

		this.hasDuration = ko.pureComputed(function() {
			return this.duration() !== undefined;
		}, this);

		this.isSelectionVisible = ko.pureComputed(function() {
			return this.selectedItems().length > 0;
		}, this);
	};

	Chart.prototype.groupStyle = function(name) {
		const style = {};

		style["background-color"] = this.groupColors()[name] || "#808080";

		return style;
	};

	Chart.prototype.updateGroups = function(rows) {
		const groupStatistics = {};
		const groups = [];
		const groupColors = {};
		let minTime = Number.POSITIVE_INFINITY;
		let maxTime = Number.NEGATIVE_INFINITY;
		let totalTime = 0;

		for (const row of rows) {
			const name = row.groupName;
			const duration = row.endTime - row.startTime;

			if (name in groupStatistics) {
				groupStatistics[name] += duration;
			} else {
				groupStatistics[name] = duration;
			}

			minTime = Math.min(row.startTime, minTime);
			maxTime = Math.max(row.endTime, maxTime);
			totalTime += duration;
		}

		Util.assignColors(Object.keys(groupStatistics), function(name, color) {
			const groupTime = groupStatistics[name];
			const duration = moment.duration(groupTime).humanize();
			const percent = ((100.0 * groupTime) / totalTime).toFixed(1);

			groups.push({
				name: name,
				color: color,
				duration: duration,
				percent: percent,
			});
			groupColors[name] = color;
		});

		this.groups(groups);
		this.groupColors(groupColors);

		if (maxTime > minTime) {
			const duration = moment.duration(maxTime - minTime).humanize();

			this.duration(duration);
		}
	};

	return Chart;
});
