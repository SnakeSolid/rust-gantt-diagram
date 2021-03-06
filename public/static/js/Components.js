"use strict";

define(["knockout"], function(ko) {
	ko.components.register("ko-connect", {
		viewModel: { require: "components/Connect" },
		template: { require: "text!components/Connect.html" },
	});

	ko.components.register("ko-chart", {
		viewModel: { require: "components/Chart" },
		template: { require: "text!components/Chart.html" },
	});

	ko.components.register("ko-settings", {
		viewModel: { require: "components/Settings" },
		template: { require: "text!components/Settings.html" },
	});
});
