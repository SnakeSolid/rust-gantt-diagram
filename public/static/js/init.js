"use strict";

requirejs.config({
	baseUrl: "/static/js",
	paths: {
		"d3": [ "https://cdnjs.cloudflare.com/ajax/libs/d3/5.7.0/d3.min", "lib/d3.min" ],
		"d3-array": [ "https://cdnjs.cloudflare.com/ajax/libs/d3-array/1.2.2/d3-array.min", "lib/d3-array.min" ],
		"d3-axis": [ "https://cdnjs.cloudflare.com/ajax/libs/d3-axis/1.0.10/d3-axis.min", "lib/d3-axis.min" ],
		"d3-collection": [ "https://cdnjs.cloudflare.com/ajax/libs/d3-collection/1.0.5/d3-collection.min", "lib/d3-collection.min" ],
		"d3-color": [ "https://cdnjs.cloudflare.com/ajax/libs/d3-color/1.2.1/d3-color.min", "lib/d3-color.min" ],
		"d3-format": [ "https://cdnjs.cloudflare.com/ajax/libs/d3-format/1.3.0/d3-format.min", "lib/d3-format.min" ],
		"d3-interpolate": [ "https://cdnjs.cloudflare.com/ajax/libs/d3-interpolate/1.3.0/d3-interpolate.min", "lib/d3-interpolate.min" ],
		"d3-scale": [ "https://cdnjs.cloudflare.com/ajax/libs/d3-scale/1.0.7/d3-scale.min", "lib/d3-scale.min" ],
		"d3-time": [ "https://cdnjs.cloudflare.com/ajax/libs/d3-time/1.0.8/d3-time.min", "lib/d3-time.min" ],
		"d3-time-format": [ "https://cdnjs.cloudflare.com/ajax/libs/d3-time-format/2.1.1/d3-time-format.min", "lib/d3-time-format.min" ],
		"knockout": [ "https://cdnjs.cloudflare.com/ajax/libs/knockout/3.4.2/knockout-min", "lib/knockout-min" ],
		"moment": [ "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.22.2/moment.min", "lib/moment.min" ],
		"reqwest": [ "https://cdnjs.cloudflare.com/ajax/libs/reqwest/2.0.5/reqwest.min", "lib/reqwest.min" ],
		"semantic": [ "https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min", "lib/semantic.min" ],
		"text": [ "https://cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text.min", "lib/text.min" ],
	},
	shim: {
		"reqwest": {
			exports: "reqwest"
		},
	},
	waitSeconds: 15,
});

// Start the main application logic.
requirejs([ "knockout", "Application" ], function(ko, Application) {
	const application = new Application();

	ko.applyBindings(application);
}, function (err) {
	console.log(err.requireType);

	if (err.requireType === "timeout") {
		console.log("modules: " + err.requireModules);
	}

	throw err;
});
