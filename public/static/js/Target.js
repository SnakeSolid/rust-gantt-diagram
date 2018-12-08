"use strict";

define([ "knockout", "moment" ], function(ko, moment) {
	const TIME_FROMAT = "YYYY.MM.DD hh:mm:ss.SSS";

	const Target = function(params) {
		this.type = params.type;
		this.name = params.name;
		this.startTime = params.startTime;
		this.endTime = params.endTime;
		this.threadName = params.threadName;
		this.groupName = params.groupName;

		this.startTimeText = ko.pureComputed(function() {
			return moment(this.startTime).format(TIME_FROMAT);
		}, this);

		this.endTimeText = ko.pureComputed(function() {
			return moment(this.endTime).format(TIME_FROMAT);
		}, this);

		this.durationText = ko.pureComputed(function() {
			return moment.duration(this.endTime - this.startTime).humanize();
		}, this);
	};

	return Target;
});
