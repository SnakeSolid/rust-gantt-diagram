"use strict";

define([ "knockout", "reqwest", "d3", "Target" ], function(ko, reqwest, d3, Target) {
	const STATE_READY = "Ready";
	const STATE_LOADING = "Loading";
	const STATE_ERROR = "Error";

	const Connect = function(params) {
		this.callback = params.callback;

		this.serverName = ko.observable("");
		this.portNumber = ko.observable(5432);
		this.userName = ko.observable("");
		this.password = ko.observable("");
		this.databaseList = ko.observableArray([]);
		this.databaseSelected = ko.observable();
		this.stageList = ko.observableArray([]);
		this.stageSelected = ko.observable();
		this.errorMessage = ko.observable("");

		this.state = ko.observable(STATE_READY);

		this.isServerNameInvalid = ko.pureComputed(function() {
			return this.serverName().length === 0;
		}, this);

		this.isPortNumberInvalid = ko.pureComputed(function() {
			const portNumber = parseInt(this.portNumber());

			return isNaN(portNumber) || portNumber < 0 || portNumber > 65535;
		}, this);

		this.isUserNameInvalid = ko.pureComputed(function() {
			return this.userName().length === 0;
		}, this);

		this.isDatabaseInvalid = ko.pureComputed(function() {
			return this.databaseSelected() === undefined;
		}, this);

		this.isStageInvalid = ko.pureComputed(function() {
			return this.stageSelected() === undefined;
		}, this);

		this.isDatabaseDisabled = ko.pureComputed(function() {
			return this.isServerNameInvalid()
				|| this.isPortNumberInvalid()
				|| this.isUserNameInvalid();
		}, this);

		this.isStageDisabled = ko.pureComputed(function() {
			return this.isServerNameInvalid()
				|| this.isPortNumberInvalid()
				|| this.isUserNameInvalid()
				|| this.isDatabaseInvalid();
		}, this);

		this.isFormInvalid = ko.pureComputed(function() {
			return this.isServerNameInvalid()
				|| this.isPortNumberInvalid()
				|| this.isUserNameInvalid()
				|| this.isDatabaseInvalid()
				|| this.isStageInvalid();
		}, this);

		this.isLoading = ko.pureComputed(function() {
			return this.state() === STATE_LOADING;
		}, this);

		this.isError = ko.pureComputed(function() {
			return this.state() === STATE_ERROR;
		}, this);

		this.databaseSelected.subscribe(function(newValue) {
			if (newValue !== undefined) {
				this.loadStages();
			} else {
				this.stageList([]);
			}
		}.bind(this));
	};

	Connect.prototype.setReady = function() {
		this.state(STATE_READY);
	};

	Connect.prototype.setLoading = function() {
		this.state(STATE_LOADING);
	};

	Connect.prototype.setError = function(message) {
		this.state(STATE_ERROR);
		this.errorMessage(message);
	};

	Connect.prototype.loadDatabases = function() {
		const res = reqwest({
			url: "/api/v1/databases",
			type: "json",
  			method: "POST",
			contentType: 'application/json',
			data: JSON.stringify({
				server: this.serverName(),
				port: parseInt(this.portNumber()),
				user: this.userName(),
				password: this.password(),
			})
		}).then(function(resp) {
			if (resp.success) {
				this.databaseList(resp.result);
				this.setReady();
			} else {
				this.setError(resp.message);
			}
		}.bind(this)).fail(function(err, msg) {
			this.setError(msg);
		}.bind(this));

		this.setLoading();
	};

	Connect.prototype.loadStages = function() {
		const res = reqwest({
			url: "/api/v1/stages",
			type: "json",
  			method: "POST",
			contentType: 'application/json',
			data: JSON.stringify({
				server: this.serverName(),
				port: parseInt(this.portNumber()),
				user: this.userName(),
				password: this.password(),
				database: this.databaseSelected(),
			})
		}).then(function(resp) {
			if (resp.success) {
				this.stageList(resp.result);
				this.setReady();
			} else {
				this.setError(resp.message);
			}
		}.bind(this)).fail(function(err, msg) {
			this.setError(msg);
		}.bind(this));

		this.setLoading();
	};

	Connect.prototype.loadData = function() {
		const res = reqwest({
			url: "/api/v1/data",
			type: "json",
  			method: "POST",
			contentType: 'application/json',
			data: JSON.stringify({
				server: this.serverName(),
				port: parseInt(this.portNumber()),
				user: this.userName(),
				password: this.password(),
				database: this.databaseSelected(),
				stage: this.stageSelected(),
			})
		}).then(function(resp) {
			if (resp.success) {
				const items = d3.dsvFormat(";").parseRows(resp.result, function(row) {
					return new Target({
						name: row[0],
						startTime: parseFloat(row[1]),
						endTime: parseFloat(row[2]),
						groupName: row[3],
						threadName: row[4],
					});
				});

				this.callback(items);
				this.setReady();
			} else {
				this.setError(resp.message);
			}
		}.bind(this)).fail(function(err, msg) {
			this.setError(msg);
		}.bind(this));

		this.setLoading();
	};

	return Connect;
});
