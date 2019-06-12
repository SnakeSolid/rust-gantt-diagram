"use strict";

define(["knockout", "reqwest", "d3", "Storage", "Target"], function(ko, reqwest, d3, Storage, Target) {
	const STATE_READY = "Ready";
	const STATE_LOADING = "Loading";
	const STATE_ERROR = "Error";

	const getQueryParams = function() {
		const query = document.location.search.replace(/^\?/, "");
		const queryParts = query.split("&");
		const queryParams = queryParts.reduce(function(acc, value) {
			const parts = value.split("=", 2);

			if (parts.length === 2) {
				const key = decodeURIComponent(parts[0]);
				const value = decodeURIComponent(parts[1]);

				acc[key] = value;
			}

			return acc;
		}, {});

		return queryParams;
	};

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
			return this.isServerNameInvalid() || this.isPortNumberInvalid() || this.isUserNameInvalid();
		}, this);

		this.isStageDisabled = ko.pureComputed(function() {
			return (
				this.isServerNameInvalid() ||
				this.isPortNumberInvalid() ||
				this.isUserNameInvalid() ||
				this.isDatabaseInvalid()
			);
		}, this);

		this.isFormInvalid = ko.pureComputed(function() {
			return (
				this.isServerNameInvalid() ||
				this.isPortNumberInvalid() ||
				this.isUserNameInvalid() ||
				this.isDatabaseInvalid() ||
				this.isStageInvalid()
			);
		}, this);

		this.isLoading = ko.pureComputed(function() {
			return this.state() === STATE_LOADING;
		}, this);

		this.isError = ko.pureComputed(function() {
			return this.state() === STATE_ERROR;
		}, this);

		this.settingsUrl = ko.pureComputed(function() {
			let queryParams = [];

			if (this.serverName() !== undefined && this.serverName().length !== 0) {
				queryParams.push({ name: "server_name", value: this.serverName() });
			}

			if (this.portNumber() !== undefined && this.portNumber().length !== 0) {
				queryParams.push({ name: "port_number", value: this.portNumber().toString() });
			}

			if (this.userName() !== undefined && this.userName().length !== 0) {
				queryParams.push({ name: "user_name", value: this.userName() });
			}

			if (this.password() !== undefined && this.password().length !== 0) {
				queryParams.push({ name: "password", value: this.password() });
			}

			if (this.databaseSelected() !== undefined) {
				queryParams.push({ name: "database", value: this.databaseSelected() });
			}

			if (this.stageSelected() !== undefined) {
				queryParams.push({ name: "stage", value: this.stageSelected() });
			}

			const href = queryParams
				.map(function(value) {
					return encodeURIComponent(value.name) + "=" + encodeURIComponent(value.value);
				})
				.join("&");

			return document.location.origin + "/?" + href;
		}, this);

		this.databaseSelected.subscribe(
			function(newValue) {
				if (newValue !== undefined) {
					this.loadStages();
				} else {
					this.stageList([]);
				}
			}.bind(this)
		);

		this.updateForm();
	};

	Connect.prototype.updateForm = function() {
		const queryParams = getQueryParams();
		const isServerNamePresent = "server_name" in queryParams;
		const isPortNumberPresent = "port_number" in queryParams;
		const isUserNamePresent = "user_name" in queryParams;
		const isPasswordPresent = "password" in queryParams;
		const isDatabasePresent = "database" in queryParams;
		const isStagePresent = "stage" in queryParams;

		if (isServerNamePresent) {
			this.serverName(queryParams["server_name"]);
		}

		if (isPortNumberPresent) {
			this.portNumber(parseInt(queryParams["port_number"]));
		}

		if (isUserNamePresent) {
			this.userName(queryParams["user_name"]);
		}

		if (isPasswordPresent) {
			this.password(queryParams["password"]);
		}

		if (isDatabasePresent) {
			const databaseName = queryParams["database"];

			this.databaseList([databaseName]);
			this.databaseSelected(databaseName);
		}

		if (isStagePresent) {
			const stageName = queryParams["stage"];

			this.stageList([stageName]);
			this.stageSelected(stageName);
		}

		if (
			isServerNamePresent &&
			isPortNumberPresent &&
			isUserNamePresent &&
			isPasswordPresent &&
			isDatabasePresent &&
			isStagePresent
		) {
			this.loadData();
		} else if (
			isServerNamePresent &&
			isPortNumberPresent &&
			isUserNamePresent &&
			isPasswordPresent &&
			isDatabasePresent
		) {
			this.loadStages();
		} else if (isServerNamePresent && isPortNumberPresent && isUserNamePresent && isPasswordPresent) {
			this.loadDatabases();
		}
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
		reqwest({
			url: "/api/v1/databases",
			type: "json",
			method: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				server: this.serverName(),
				port: parseInt(this.portNumber()),
				user: this.userName(),
				password: this.password(),
			}),
		})
			.then(
				function(resp) {
					if (resp.success) {
						this.databaseList(resp.result);
						this.setReady();
					} else {
						this.setError(resp.message);
					}
				}.bind(this)
			)
			.fail(
				function(resp) {
					this.setError(resp.responseText);
				}.bind(this)
			);

		this.setLoading();
	};

	Connect.prototype.loadStages = function() {
		reqwest({
			url: "/api/v1/stages",
			type: "json",
			method: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				server: this.serverName(),
				port: parseInt(this.portNumber()),
				user: this.userName(),
				password: this.password(),
				database: this.databaseSelected(),
			}),
		})
			.then(
				function(resp) {
					if (resp.success) {
						this.stageList(resp.result);
						this.setReady();
					} else {
						this.setError(resp.message);
					}
				}.bind(this)
			)
			.fail(
				function(resp) {
					this.setError(resp.responseText);
				}.bind(this)
			);

		this.setLoading();
	};

	Connect.prototype.loadData = function() {
		reqwest({
			url: "/api/v1/data",
			method: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				server: this.serverName(),
				port: parseInt(this.portNumber()),
				user: this.userName(),
				password: this.password(),
				database: this.databaseSelected(),
				stage: this.stageSelected(),
			}),
		})
			.then(
				function(resp) {
					const mappings = Storage.getGroupMapping();
					const items = d3.dsvFormat(";").parseRows(resp, function(row) {
						const groupName = row[3];

						return new Target({
							name: row[0],
							startTime: parseFloat(row[1]),
							endTime: parseFloat(row[2]),
							groupName: groupName in mappings ? mappings[groupName] : groupName,
							threadName: row[4],
						});
					});

					this.callback(items);
					this.setReady();
				}.bind(this)
			)
			.fail(
				function(resp) {
					this.setError(resp.responseText);
				}.bind(this)
			);

		this.setLoading();
	};

	return Connect;
});
