"use strict";

define(["knockout", "Components", "bindings/GanttChart"], function(ko) {
	const PAGE_CONNECT = "Connect";
	const PAGE_CHART = "Chart";
	const PAGE_SETTINGS = "Settings";

	const Application = function() {
		this.currentPage = ko.observable(PAGE_CONNECT);
		this.items = ko.observable([]);

		this.isConnectVisible = ko.pureComputed(function() {
			return this.currentPage() === PAGE_CONNECT;
		}, this);

		this.isChartVisible = ko.pureComputed(function() {
			return this.currentPage() === PAGE_CHART;
		}, this);

		this.isSettingsVisible = ko.pureComputed(function() {
			return this.currentPage() === PAGE_SETTINGS;
		}, this);

		this.showChart = function(items) {
			this.items(items);
			this.currentPage(PAGE_CHART);
		}.bind(this);
	};

	Application.prototype.setConnectPage = function() {
		this.currentPage(PAGE_CONNECT);
	};

	Application.prototype.setChartPage = function() {
		this.currentPage(PAGE_CHART);
	};

	Application.prototype.setSettingsPage = function() {
		this.currentPage(PAGE_SETTINGS);
	};

	return Application;
});
