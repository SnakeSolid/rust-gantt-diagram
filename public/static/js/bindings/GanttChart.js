"use strict";

define([ "knockout", "d3", "moment", "Util", "d3-color", "d3-axis" ], function(ko, d3, moment, Util) {
	const KEY_CHART = "chart";
	const THRESHOLD_DRAW = 0.01;
	const THRESHOLD_LINE = 0.1;

	const CHART_FONT = "14px sans-serif";
	const CHART_PADDING_LEFT = 140;
	const CHART_PADDING_RIGHT = 60;
	const CHART_PADDING_TOP = 1;
	const CHART_PADDING_BOTTOM = 35;
	const CHART_THREAD_HEIGHT = 32;
	const CHART_THREAD_OFFSET = 6.5;
	const CHART_CURSOR_COLOR = "#ffffff";
	const CHART_PRIMARY_COLOR = "#000000";
	const CHART_SECONDARY_COLOR = "#00000040";

	const X_AXIS_TICK_SIZE = 5;
	const X_AXIS_DATE_LABEL_OFFSET = 20;
	const X_AXIS_TIME_LABEL_OFFSET = 35;

	const Y_AXIS_TICK_SIZE = 5;
	const Y_AXIS_LABEL_SHIFT = 3;
	const Y_AXIS_LABEL_OFFSET = 21;

	const GanttChart = function(params) {
		this.canvas = params.canvas;
		this.context = params.context;
		this.hilightCallback = params.hilightCallback || null;
		this.selectCallback = params.selectCallback || null;

		this.items = [];
		this.nThreadLines = 0;
		this.threadLines = {};
		this.groupColors = {};
		this.timeMin = null;
		this.timeMax = null;
		this.viewMin = null;
		this.viewMax = null;
		this.xScale = null;
		this.yScale = null;
		this.isFrameRequested = false;
		this.isPanMode = false;
		this.panPosition = null;
		this.cursorPosition = null;
		this.cursorThread = null;
		this.isSimpleClick = false;

		this.addEventListeners();
	};

	GanttChart.prototype.addEventListeners = function() {
		this.canvas.addEventListener("wheel", this.onWhell.bind(this));
		this.canvas.addEventListener("mousedown", this.onPanStart.bind(this));
		this.canvas.addEventListener("mousemove", this.onPanMove.bind(this));
		this.canvas.addEventListener("mouseup", this.onPanStop.bind(this));
		this.canvas.addEventListener("mouseout", this.onPanStop.bind(this));
		this.canvas.addEventListener("click", this.onSelect.bind(this));
	};

	const getCursorPosition = function(event) {
		const target = event.target;
		const clientRect = target.getBoundingClientRect();
		const x = event.clientX - clientRect.left;
		const y = event.clientY - clientRect.top;

		if (x < CHART_PADDING_LEFT
			|| x > target.width - CHART_PADDING_RIGHT
			|| y < CHART_PADDING_TOP
			|| y > target.height - CHART_PADDING_BOTTOM) {
			return null;
		}

		return [ x, y ];
	};

	GanttChart.prototype.onSelect = function(event) {
		if (!this.isInitialized() || !this.isSimpleClick || event.button !== 0 || this.selectCallback === null) {
			return;
		}

		const cursorPosition = getCursorPosition(event);

		if (cursorPosition === null) {
			return;
		}

		const x = cursorPosition[0];
		const positionX = this.xScale.invert(x).getTime();
		const selectedItems = [];

		for (const item of this.items) {
			if (item.endTime < positionX || item.startTime > positionX) {
				continue;
			}

			const threadIndex = this.threadLines[item.threadName];

			if (this.cursorThread === threadIndex) {
				selectedItems.push(item);
			}
		}

		this.selectCallback(selectedItems);

		event.preventDefault();
	}

	GanttChart.prototype.onPanStart = function(event) {
		if (!this.isInitialized() || event.button !== 0) {
			return;
		}

		const cursorPosition = getCursorPosition(event);

		if (cursorPosition === null) {
			return;
		}

		this.isPanMode = true;
		this.panPosition = this.xScale.invert(cursorPosition[0]).getTime();
		this.isSimpleClick = true;

		event.preventDefault();
	};

	GanttChart.prototype.onPanMove = function(event) {
		if (!this.isInitialized()) {
			return;
		}

		const cursorPosition = getCursorPosition(event);

		if (cursorPosition === null) {
			return;
		}

		this.isSimpleClick = false;

		const x = cursorPosition[0];
		const y = cursorPosition[1];
		const positionX = this.xScale.invert(x).getTime();

		if (this.isPanMode) {
			const viewOffset = this.panPosition - positionX;

			this.viewMin += viewOffset;
			this.viewMax += viewOffset;
			this.adjustView(positionX);
			this.panPosition =  this.xScale.invert(x).getTime();
		}

		this.cursorPosition = positionX;
		this.cursorThread = Math.floor((y - CHART_PADDING_TOP) / CHART_THREAD_HEIGHT);
		this.doDraw();

		event.preventDefault();
	};

	GanttChart.prototype.onPanStop = function(event) {
		if (!this.isInitialized() && event.button !== 0) {
			return;
		}

		this.isPanMode = false;
		this.panPosition = null;
		this.cursorPosition = null;

		event.preventDefault();
	};

	GanttChart.prototype.onWhell = function(event) {
		const cursorPosition = getCursorPosition(event);

		if (cursorPosition === null) {
			return;
		}

		const delta = event.deltaY;

		if (Math.abs(delta) < 0.1) {
			return;
		}

		const x = cursorPosition[0];
		const viewPosition = this.xScale.invert(x).getTime();
		const factor = Math.pow(1.1, delta);

		this.viewMin = factor * (this.viewMin - viewPosition) + viewPosition;
		this.viewMax = factor * (this.viewMax - viewPosition) + viewPosition;
		this.adjustView(viewPosition);
		this.doDraw();

		event.preventDefault();
	};

	GanttChart.prototype.adjustView = function(position) {
		const viewDiff = this.viewMax - this.viewMin;

		if (viewDiff < 10.0) {
			const fixFactor = 10.0 / (viewDiff);

			this.viewMin = fixFactor * (this.viewMin - position) + position;
			this.viewMax = fixFactor * (this.viewMax - position) + position;
		}

		if (this.viewMin < this.timeMin) {
			this.viewMin = this.timeMin;
			this.viewMax = this.timeMin + viewDiff;
		}

		if (this.viewMax > this.timeMax) {
			this.viewMin = this.timeMax - viewDiff;
			this.viewMax = this.timeMax;
		}

		if (this.viewMin < this.timeMin) {
			this.viewMin = this.timeMin;
		}

		this.xScale.domain([ this.viewMin, this.viewMax ]);
	};

	GanttChart.prototype.setItems = function(items) {
		const uniqueThreads = new Set();
		const uniqueGroups = new Set();
		let timeMin = Infinity;
		let timeMax = -Infinity;

		for (const item of items) {
			uniqueThreads.add(item.threadName);
			uniqueGroups.add(item.groupName);

			timeMin = Math.min(timeMin, item.startTime);
			timeMax = Math.max(timeMax, item.endTime);
		}

		const threadLines = {};
		const threadNames = []
		const groupColors = {};

		Util.assignIndexes(uniqueThreads, function(name, index) {
			threadLines[name] = index;
			threadNames.push(name);
		});

		Util.assignColors(uniqueGroups, function(name, color) {
			groupColors[name] = color;
		});

		this.canvas.height = CHART_PADDING_TOP + CHART_PADDING_BOTTOM + CHART_THREAD_HEIGHT * uniqueThreads.size;

		this.items = items;
		this.nThreadLines = uniqueThreads.size;
		this.threadLines = threadLines;
		this.groupColors = groupColors;
		this.timeMin = timeMin;
		this.timeMax = timeMax;
		this.viewMin = timeMin;
		this.viewMax = timeMax;

		if (threadNames.length > 0) {
			this.xScale = d3.scaleUtc()
				.domain([this.viewMin, this.viewMax])
				.range([CHART_PADDING_LEFT, this.canvas.width - CHART_PADDING_RIGHT]);
			this.yScale = d3.scaleQuantize()
				.domain([0, uniqueThreads.size - 1])
				.range(threadNames);

			requestAnimationFrame(this.draw.bind(this));
		}
	};

	GanttChart.prototype.isInitialized = function() {
		return this.items.length !== 0 && this.xScale !== null && this.yScale !== null;
	}

	GanttChart.prototype.doDraw = function() {
		if (this.isInitialized() && !this.isFrameRequested) {
			this.isFrameRequested = true;

			requestAnimationFrame(function() {
				this.draw();

				this.isFrameRequested = false;
			}.bind(this));
		}
	};

	GanttChart.prototype.draw = function() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		this.drawYAxis();
		this.drawXAxis();
		this.drawBlocks();
		this.drawCursor();
	};

	GanttChart.prototype.drawCursor = function() {
		if (this.isPanMode || this.cursorPosition === null) {
			return;
		}

		const y = this.xScale(this.cursorPosition);

		this.context.lineWidth = 3;
		this.context.strokeStyle = CHART_PRIMARY_COLOR;
		this.context.beginPath();
		this.context.moveTo(y - 0.5, CHART_PADDING_TOP);
		this.context.lineTo(y - 0.5, CHART_PADDING_TOP + CHART_THREAD_HEIGHT * this.nThreadLines);
		this.context.stroke();

		this.context.lineWidth = 1;
		this.context.strokeStyle = CHART_CURSOR_COLOR;
		this.context.beginPath();
		this.context.moveTo(y - 0.5, CHART_PADDING_TOP);
		this.context.lineTo(y - 0.5, CHART_PADDING_TOP + CHART_THREAD_HEIGHT * this.nThreadLines);
		this.context.stroke();
	}

	GanttChart.prototype.drawBlocks = function() {
		this.context.save();
		this.context.beginPath();
		this.context.rect(
				CHART_PADDING_LEFT,
				CHART_PADDING_TOP,
				this.canvas.width - CHART_PADDING_RIGHT - CHART_PADDING_LEFT,
				this.canvas.height - CHART_PADDING_BOTTOM - CHART_PADDING_TOP
			 );
		this.context.clip();

		this.context.lineWidth = 1;
		this.context.strokeStyle = "#00000060";

		for (const item of this.items) {
			if (item.endTime < this.viewMin || item.startTime > this.viewMax) {
				continue;
			}

			let startX = this.xScale(item.startTime);
			let endX = this.xScale(item.endTime);

			if (startX < CHART_PADDING_LEFT - 1.0) {
				startX < CHART_PADDING_LEFT - 1.0;
			}

			if (endX > this.canvas.width - CHART_PADDING_RIGHT + 1.0) {
				endX > this.canvas.width - CHART_PADDING_RIGHT + 1.0;
			}

			const width = endX - startX;

			if (width < THRESHOLD_DRAW) {
				continue;
			}

			const threadIndex = this.threadLines[item.threadName];
			const groupColor = this.groupColors[item.groupName];

			this.context.beginPath();
			this.context.rect(startX, CHART_THREAD_OFFSET + CHART_THREAD_HEIGHT * threadIndex, width, 21);
			this.context.fillStyle = groupColor;

			if (width > THRESHOLD_LINE) {
				this.context.fill();
			}

			this.context.stroke();
		}

		this.context.restore();
	}

	GanttChart.prototype.drawYAxis = function() {
		const scaleRange = this.yScale.range();

		for (let index = 0; index < scaleRange.length; index += 1) {
			const y = CHART_PADDING_TOP + CHART_THREAD_HEIGHT * index;
			const name = scaleRange[index];

			this.context.lineWidth = 2;
			this.context.strokeStyle = CHART_SECONDARY_COLOR;
			this.context.beginPath();
			this.context.moveTo(CHART_PADDING_LEFT, y);
			this.context.lineTo(this.canvas.width - CHART_PADDING_RIGHT, y);
			this.context.stroke();

			this.context.lineWidth = 2;
			this.context.strokeStyle = CHART_PRIMARY_COLOR;
			this.context.beginPath();
			this.context.moveTo(CHART_PADDING_LEFT - Y_AXIS_TICK_SIZE, y);
			this.context.lineTo(CHART_PADDING_LEFT, y);
			this.context.stroke();

			this.context.font = CHART_FONT;
			this.context.fillStyle = "#000000";
			this.context.textAlign = "right";
			this.context.fillText(name, CHART_PADDING_LEFT - Y_AXIS_LABEL_SHIFT, y + Y_AXIS_LABEL_OFFSET);
		}

		this.context.lineWidth = 2;
		this.context.strokeStyle = CHART_PRIMARY_COLOR;
		this.context.beginPath();
		this.context.moveTo(CHART_PADDING_LEFT, CHART_PADDING_TOP);
		this.context.lineTo(CHART_PADDING_LEFT, CHART_PADDING_TOP + CHART_THREAD_HEIGHT * this.nThreadLines);
		this.context.stroke();
	};

	GanttChart.prototype.drawXAxis = function() {
		let timeFormat;

		if (this.viewMax - this.viewMin > 10 * 60 * 60 * 1000) {
			timeFormat = "hh:mm";
		} else if (this.viewMax - this.viewMin > 30 * 1000) {
			timeFormat = "hh:mm:ss";
		} else {
			timeFormat = "hh:mm:ss.SSS";
		}

		for (const tick of this.xScale.ticks()) {
			const x = this.xScale(tick);
			const tickDateLabel = moment(tick).format("YYYY.MM.DD");
			const tickTimeLabel = moment(tick).format(timeFormat);

			this.context.lineWidth = 2;
			this.context.strokeStyle = CHART_SECONDARY_COLOR;
			this.context.beginPath();
			this.context.moveTo(x, CHART_PADDING_TOP);
			this.context.lineTo(x, CHART_PADDING_TOP + CHART_THREAD_HEIGHT * this.nThreadLines);
			this.context.stroke();

			this.context.lineWidth = 2;
			this.context.strokeStyle = CHART_PRIMARY_COLOR;
			this.context.beginPath();
			this.context.moveTo(x, CHART_PADDING_TOP + CHART_THREAD_HEIGHT * this.nThreadLines);
			this.context.lineTo(x, CHART_PADDING_TOP + X_AXIS_TICK_SIZE + CHART_THREAD_HEIGHT * this.nThreadLines);
			this.context.stroke();

			this.context.font = CHART_FONT;
			this.context.fillStyle = "#000000";
			this.context.textAlign = "center";
			this.context.fillText(tickDateLabel, x, X_AXIS_DATE_LABEL_OFFSET + CHART_THREAD_HEIGHT * this.nThreadLines);
			this.context.fillText(tickTimeLabel, x, X_AXIS_TIME_LABEL_OFFSET + CHART_THREAD_HEIGHT * this.nThreadLines);
		}

		const scaleRange = this.xScale.range();

		this.context.lineWidth = 2;
		this.context.strokeStyle = CHART_PRIMARY_COLOR;
		this.context.beginPath();
		this.context.moveTo(scaleRange[0], CHART_PADDING_TOP + CHART_THREAD_HEIGHT * this.nThreadLines);
		this.context.lineTo(scaleRange[1], CHART_PADDING_TOP + CHART_THREAD_HEIGHT * this.nThreadLines);
		this.context.stroke();
	};

	ko.bindingHandlers.ganttChart = {
		init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
			const params = ko.unwrap(valueAccessor());
			const hilightCallback = params.hilightCallback;
			const selectCallback = params.selectCallback;
			const width = window.innerWidth - 4;
			const canvas = d3.select(element)
				.append("canvas")
				.attr("width", width)
				.attr("height", 1)
				.node();
			const context = canvas.getContext("2d");
			const chart = new GanttChart({
				canvas: canvas,
				context: context,
				hilightCallback: hilightCallback,
				selectCallback: selectCallback,
			});

			ko.utils.domData.set(element, KEY_CHART, chart);
		},
		update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
			const params = ko.unwrap(valueAccessor());
			const items = ko.unwrap(params.items);
			const chart = ko.utils.domData.get(element, KEY_CHART);

			chart.setItems(items);
		}
	};
});
