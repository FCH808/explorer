/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
<<<<<<< HEAD
	"dijit/registry",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/fx",
	"dojo/_base/lang",
	"dojo/Deferred",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/mouse",
	"dojo/number",
	"dojo/query",
	"dojo/topic",
	"esri/Color",
	"esri/graphic",
	"esri/geometry/Extent",
	"esri/SpatialReference",
	"esri/layers/ArcGISImageServiceLayer",
	"esri/layers/ImageServiceParameters",
	"esri/layers/MosaicRule",
	"esri/tasks/query",
	"esri/tasks/QueryTask"
], function (registry, array, declare, fx, lang, Deferred, dom, domAttr, domConstruct, domGeom, domStyle, mouse, number, query, topic, Color, Graphic, Extent, SpatialReference, ArcGISImageServiceLayer, ImageServiceParameters, MosaicRule, Query, QueryTask) {
	return declare(null, {

		config: {},
		_main: {},
		timeline: "",
		timelineOptions: {},
		timelineContainerNodeGeom: "",
		timelineContainerGeometry: "",
		timelineData: [],

		constructor: function (obj, templateConfig) {
			// config file
			this.config = templateConfig;
			this._main = obj;
			// timeline options
			this.timelineOptions = {
				"width": "100%",
				"height": this.config.TIMELINE_HEIGHT + "px",
				"style": this.config.TIMELINE_STYLE,
				"showNavigation": this.config.TIMELINE_SHOW_NAVIGATION,
				"max": new Date(this.config.TIMELINE_MAX_DATE, 0, 0),
				"min": new Date(this.config.TIMELINE_MIN_DATE, 0, 0),
				"scale": links.Timeline.StepDate.SCALE.YEAR,
				"step": this.config.TIMELINE_STEP,
				"stackEvents": true,
				"zoomMax": this.config.TIMELINE_ZOOM_MAX,
				"zoomMin": this.config.TIMELINE_ZOOM_MIN,
				"cluster": this.config.TIMELINE_CLUSTER,
				"animate": this.config.TIMELINE_ANIMATE
			};
		},

		runQuery: function (mapExtent, mp, lod) {
			var queryTask = new QueryTask(this.config.QUERY_TASK_URL),
				q = new Query();
			q.returnGeometry = true;
			q.outFields = this.config.QUERY_TASK_OUTFIELDS;
			q.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
			// TODO confirm with CF/SB where clause is correct
			if (this.config.QUERY_WHERE !== "") {
				q.where = this.config.QUERY_WHERE;
			}
			if (this.config.QUERY_GEOMETRY === "MAP_POINT") {
				q.geometry = mp;
			} else {
				q.geometry = mapExtent.expand(this.config.EXTENT_EXPAND);
			}

			var deferred = queryTask.execute(q).addCallback(lang.hitch(this, function (response) {
				this.timelineData = [];
				var nFeatures = response.features.length;

				if (nFeatures > 0) {
					query(".timeline-mask").forEach(domConstruct.destroy);
					this.timelineContainerNodeGeom = domStyle.getComputedStyle(this._main.timelineContainerNode);
					this.timelineContainerGeometry = domGeom.getContentBox(this._main.timelineContainerNode, this._main.timelineContainerNodeGeom);
					if (this.timelineContainerGeometry.h === 0) {
						var n = registry.byId("timeline-container").domNode;
						fx.animateProperty({
							node: n,
							duration: 1000,
							properties: {
								height: {
									end: parseInt(this.config.TIMELINE_HEIGHT) + 20
								}
							},
							onEnd: function () {
								registry.byId("main-window").layout();
							}
						}).play();
					}

					array.forEach(response.features, lang.hitch(this, function (feature) {
						var ext = feature.geometry.getExtent();
						var xmin = ext.xmin;
						var xmax = ext.xmax;
						var ymin = ext.ymin;
						var ymax = ext.ymax;

						var objID = feature.attributes[this.config.ATTRIBUTE_OBJECTID];
						var mapName = feature.attributes[this.config.ATTRIBUTE_MAP_NAME];
						var scale = feature.attributes[this.config.ATTRIBUTE_SCALE];
						var dateCurrent = new Date(feature.attributes[this.config.ATTRIBUTE_DATE]);
						if (dateCurrent === null)
							dateCurrent = this.config.MSG_UNKNOWN;
						var day = this.formatDay(dateCurrent);
						var month = this.formatMonth(dateCurrent);
						var year = this.formatYear(dateCurrent);
						var formattedDate = month + "/" + day + "/" + year;

						var startDate = new Date(dateCurrent, month, day);

						var downloadLink = feature.attributes[this.config.ATTRIBUTE_DOWNLOAD_LINK];
						var citation = feature.attributes[this.config.ATTRIBUTE_CITATION];

						var className = this._main.timelineLegendUtils.setClassname(scale, this._main.TOPO_MAP_SCALES);
						var lodThreshold = this._main.timelineLegendUtils.setLodThreshold(scale, this._main.TOPO_MAP_SCALES, this._main.nScales, this._main.minScaleValue, this._main.maxScaleValue);

						var tooltipContent = "<img class='tooltipThumbnail' src='" + this.config.IMAGE_SERVER + "/" + objID + this.config.INFO_THUMBNAIL + "'>" +
								"<div class='tooltipContainer'>" +
								"<div class='tooltipHeader'>" + mapName + " (" + formattedDate + ")</div>" +
								"<div class='tooltipContent'>" + citation + "</div></div>";

						var timelineItemContent = '<div class="timelineItemTooltip noThumbnail" title="' + tooltipContent + '" data-xmin="' + xmin + '" data-ymin="' + ymin + '" data-xmax="' + xmax + '" data-ymax="' + ymax + '">' +
								'<span class="thumbnailLabel">' + mapName + '</span>';

						this.timelineData.push({
							"start": startDate,
							"content": timelineItemContent,
							"objID": objID,
							"downloadLink": downloadLink,
							"scale": scale,
							"lodThreshold": lodThreshold,
							"className": className
						});
					})); // END forEach
				} else {
					this._main.userInterfaceUtils.addNoResultsMask();
				} // END QUERY
				this.drawTimeline(this.timelineData);
			})); // END Deferred
		},

		drawTimeline: function (data) {
			this._main.filteredData = this._main._filterData(data, this._main.filter);
			topic.subscribe("/dnd/drop", lang.hitch(this, function (source, nodes, copy, target) {
				var layers = [];
				//query(".grid-map").forEach(domConstruct.destroy);
				query(".dgrid-row").forEach(lang.hitch(this, function (node) {
					var row = target.grid.row(node);
					if (row) {
						layers.push(row.data.layer);
						this._main.map.removeLayer(row.data.layer);

						var lodThreshold = row.data.lodThreshold;
						var maskId = domAttr.get(node, "id") + "-mask";
						if (this._main.currentLOD <= lodThreshold) {
							// disable row
							if (dom.byId("" + maskId) === null) {
								domConstruct.create("div", {
									"id":"" + maskId,
									"class":"grid-map",
									"innerHTML":"<p style='text-align: center; margin-top: 20px'>" + this.config.THUMBNAIL_VISIBLE_THRESHOLD_MSG + "</p>"
								}, node, "first");
							}
						} else {
							// enable row
							domConstruct.destroy("" + maskId);
						}
					}
				}));

				var j = layers.length;
				while (j >= 0) {
					this._main.map.addLayer(layers[j]);
					j--;
				}
			}));

			if (this.timeline === undefined || this.timeline === null || this.timeline === "") {
				if (this._main.urlQueryObject) {
					this.timelineOptions.start = new Date(this._main.urlQueryObject.minDate, 0, 0);
					this.timelineOptions.end = new Date(this._main.urlQueryObject.maxDate, 0, 0);
				}
				this.timeline = new links.Timeline(dom.byId("timeline"));
				this.timeline.draw(this._main.filteredData, this.timelineOptions);
				links.events.addListener(this.timeline, "ready", this._onTimelineReady);
				links.events.addListener(this.timeline, "select", lang.hitch(this, "_onSelect"));
				//links.events.addListener(timeline, "rangechanged", timelineRangeChanged);
				this._main.userInterfaceUtils.hideStep(".stepOne", "");
				this._main.userInterfaceUtils.showStep(".stepTwo", ".step-two-message");
			} else {
				var height = this.timelineContainerGeometry ? this.timelineContainerGeometry.h : this.config.TIMELINE_HEIGHT;
				//this.timelineOptions.height = height + "px";
				//this.timeline.draw(this.filteredData, this.timelineOptions);
				this.timeline.setData(this._main.filteredData);
				this.timeline.redraw();
			}

			$(".timelineItemTooltip").tooltipster({
				theme:"tooltipster-shadow",
				contentAsHTML:true,
				position:"right",
				offsetY:20
			});


			query(".timeline-event").on(mouse.enter, lang.hitch(this, function (evt) {
				var xmin, ymin, xmax, ymax, extent, sfs;
				if (evt.target.children[0] !== undefined && evt.target.children[0].children[0] !== undefined) {
					if (evt.target.children[0].children[0].getAttribute("data-xmin")) {
						xmin = evt.target.children[0].children[0].getAttribute("data-xmin");
						xmax = evt.target.children[0].children[0].getAttribute("data-xmax");
						ymin = evt.target.children[0].children[0].getAttribute("data-ymin");
						ymax = evt.target.children[0].children[0].getAttribute("data-ymax");
						extent = new Extent(xmin, ymin, xmax, ymax, new SpatialReference({
							wkid:102100
						}));
						sfs = this._main.userInterfaceUtils.createMouseOverGraphic(
								new Color(this.config.TIMELINE_ITEM_MOUSEOVER_GR_BORDER),
								new Color(this.config.TIMELINE_ITEM_MOUSEOVER_GR_FILL));
						this._main.mouseOverGraphic = new Graphic(extent, sfs);
						this._main.map.graphics.add(this._main.mouseOverGraphic);
					}
					// TODO
					var data = evt.currentTarget.childNodes[0].childNodes[0].dataset;
					if (data) {
						extent = new Extent(data.xmin, data.ymin, data.xmax, data.ymax, new SpatialReference({
							wkid:102100
						}));
						sfs = this._main.userInterfaceUtils.createMouseOverGraphic(
								new Color(this.config.TIMELINE_ITEM_MOUSEOVER_GR_BORDER),
								new Color(this.config.TIMELINE_ITEM_MOUSEOVER_GR_FILL));
						this._main.mouseOverGraphic = new Graphic(extent, sfs);
						this._main.map.graphics.add(this._main.mouseOverGraphic);
					}
				}
			}));

			query(".timeline-event").on(mouse.leave, lang.hitch(this, function (evt) {
				this._main.map.graphics.remove(this._main.mouseOverGraphic);
				this._main.map.graphics.clear();
				this._main.userInterfaceUtils.addCrosshair(this._main.currentMapClickPoint);
			}));
		},

		_onSelect:function () {
			var sel = this.timeline.getSelection();
			var _timelineData = this.timeline.getData();
			if (sel.length) {
				if (sel[0].row !== undefined) {
					var row = sel[0].row;
					var objID = _timelineData[row].objID;
					var downloadLink = _timelineData[row].downloadLink;
					var lodThreshhold = _timelineData[row].lodThreshold;
					var whereClause = this.config.IMAGE_SERVER_WHERE + objID;
					var queryTask = new QueryTask(this._main.IMAGE_SERVICE_URL);
					var q = new Query();
					q.returnGeometry = false;
					q.outFields = this.config.OUTFIELDS;
					q.where = whereClause;
					var imageServiceLayer;
					queryTask.execute(q, lang.hitch(this, function (rs) {
						var extent = rs.features[0].geometry.getExtent();
						var mapName = rs.features[0].attributes.Map_Name;
						var dateCurrent = rs.features[0].attributes.DateCurrent;

						if (dateCurrent === null)
							dateCurrent = this.config.MSG_UNKNOWN;
						var scale = rs.features[0].attributes.Map_Scale;
						var scaleLabel = number.format(scale, {
							places:0
						});

						var mosaicRule = new MosaicRule({
							"method":MosaicRule.METHOD_CENTER,
							"ascending":true,
							"operation":MosaicRule.OPERATION_FIRST,
							"where":whereClause
						});
						var params = new ImageServiceParameters();
						params.noData = 0;
						params.mosaicRule = mosaicRule;
						imageServiceLayer = new ArcGISImageServiceLayer(this._main.IMAGE_SERVICE_URL, {
							imageServiceParameters: params,
							opacity:1.0
						});
						this._main.map.addLayer(imageServiceLayer);

						var _firstRow;
						if (query(".dgrid-row", this._main.grid.domNode)[0]) {
							var rowId = query(".dgrid-row", this._main.grid.domNode)[0].id;
							_firstRow = rowId.split("-")[2];
						}

						var firstRowObj = this._main.store.query({
							objID:_firstRow
						});

						this._main.store.put({
							id:1,
							objID:objID,
							layer:imageServiceLayer,
							name:mapName,
							imprintYear:dateCurrent,
							scale:scale,
							scaleLabel:scaleLabel,
							lodThreshold:lodThreshhold,
							downloadLink:downloadLink,
							extent:extent
						}), {
							before:firstRowObj[0]
						};
					})).then(lang.hitch(this, function (evt) {
						this._main.userInterfaceUtils.hideStep(".stepTwo", ".step-two-message");
						this._main.userInterfaceUtils.showStep(".stepThree", ".step-three-message");
						this._main.userInterfaceUtils.showGrid();
						this._main.grid.refresh();
					}));
				}
			}
		},

		_onTimelineReady:function () {
			// if the grid is visible, step 3 is visible, so hide step 2
			if (domStyle.get(query(".gridContainer")[0], "display") === "block") {
				this._main.userInterfaceUtils.hideStep(".stepTwo", ".step-two-message");
			}
=======
	"dojo/_base/declare"
], function (declare) {
	return declare(null, {

		config: {},

		constructor: function (templateConfig) {
			this.config = templateConfig;
>>>>>>> 81555525942cc5a727b248069e3388f83911aad9
		},

		formatDay:function (date) {
			if (date instanceof Date) {
				return date.getDate();
			} else {
				return "";
			}
		},

		formatMonth:function (date) {
			if (date instanceof Date) {
				var month = date.getMonth();
				if (month === 0) {
					return "01";
				} else if (month === 1) {
					return "02";
				} else if (month === 2) {
					return "03";
				} else if (month === 3) {
					return "04";
				} else if (month === 4) {
					return "05";
				} else if (month === 5) {
					return "06";
				} else if (month === 6) {
					return "07";
				} else if (month === 7) {
					return "08";
				} else if (month === 8) {
					return "09";
				} else if (month === 9) {
					return "10";
				} else if (month === 10) {
					return "11";
				} else if (month === 11) {
					return "12";
				}
			} else {
				return "";
			}
		},

		formatYear:function (date) {
			if (date instanceof Date) {
				return date.getFullYear();
			} else {
				return "";
			}
		}
	});
});
