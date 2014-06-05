require([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/fx",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/Deferred",
	"dojo/aspect",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/io-query",
	"dojo/json",
	"dojo/mouse",
	"dojo/number",
	"dojo/on",
	"dojo/parser",
	"dojo/promise/all",
	"dojo/query",
	"dojo/ready",
	"dojo/topic",
	"dojo/store/Observable",
	"dojo/store/Memory",
	"dojo/window",
	"dgrid/extensions/DnD",
	"dgrid/OnDemandGrid",
	"dgrid/editor",
	"dgrid/Selection",
	"dgrid/Keyboard",
	"dgrid/util/mouse",
	"dijit/form/Button",
	"dijit/form/HorizontalSlider",
	"dijit/layout/BorderContainer",
	"dijit/layout/ContentPane",
	"dijit/registry",
	"esri/arcgis/utils",
	"esri/dijit/Geocoder",
	"esri/geometry/Extent",
	"esri/SpatialReference",
	"esri/graphic",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/ArcGISImageServiceLayer",
	"esri/layers/ImageServiceParameters",
	"esri/layers/MosaicRule",
	"esri/map",
	"esri/symbols/SimpleFillSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/Color",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/urlUtils",
	"dojo/domReady!"],
		function (array, declare, fx, lang, win, Deferred, aspect, dom, domAttr, domClass, domConstruct, domGeom, domStyle, ioQuery, json, mouse, number, on, parser, all, query, ready, topic, Observable, Memory, win, DnD, Grid, editor, Selection, Keyboard, mouseUtil, Button, HorizontalSlider, BorderContainer, ContentPane, registry, arcgisUtils, Geocoder, Extent, SpatialReference, Graphic, ArcGISDynamicMapServiceLayer, ArcGISImageServiceLayer, ImageServiceParameters, MosaicRule, Map, SimpleFillSymbol, SimpleLineSymbol, Color, Query, QueryTask, urlUtils) {

			var map,

					OUTFIELDS,
					TOKEN,
					IMAGE_SERVICE_URL,
					imageServiceLayer,
					DOWNLOAD_PATH,

			// dgrid store
					store,
					storeData = [],

			// dgrid
					grid,
			// dgrid columns
					columns,
					mouseOverGraphic,

			// timeline data and filters
					timeline,
					timelineOptions,
					timelineData = [],
					filter = [],
					TOPO_MAP_SCALES,
					scales = [],

			// sharing URL
					sharingUrl,
			//urlObject,
					urlQueryObject,
			// loading icon
					loading,

			// timeline container dimensions
					timelineContainerGeometry,

					filterSelection = [],

					legendNode;

			ready(function () {
				parser.parse();
				document.title = Config.APP_TITLE;
				OUTFIELDS = Config.OUTFIELDS;
				TOKEN = Config.TOKEN;
				IMAGE_SERVICE_URL = "http://historical1.arcgis.com/arcgis/rest/services/USA_Historical_Topo_Maps/ImageServer?self?culture=en&f=json&token=" + TOKEN;
				TOPO_MAP_SCALES = Config.TIMELINE_LEGEND_VALUES;
				for (var i = 0; i < TOPO_MAP_SCALES.length; i++) {
					scales.push(TOPO_MAP_SCALES[i].value);
				}
				DOWNLOAD_PATH = Config.DOWNLOAD_PATH;

				setAppHeaderStyle(Config.APP_HEADER_TEXT_COLOR, Config.APP_HEADER_BACKGROUND_COLOR);
				setAppHeaderTitle(Config.APP_HEADER_TEXT);
				setAppHeaderSubtitle(Config.APP_SUBHEADER_TEXT);
				setAppMessage(".step-one-message", Config.STEP_ONE_MESSAGE);
				setAppMessage(".step-one-half-circle-msg", Config.STEP_ONE_HALF_CIRCLE_MSG);
				setAppMessage(".step-two-message", Config.STEP_TWO_MESSAGE);
				setAppMessage(".step-two-half-circle-msg", Config.STEP_TWO_HALF_CIRCLE_MSG);
				setHalfCircleStyle(Config.HALF_CIRCLE_BACKGROUND_COLOR, Config.HALF_CIRCLE_COLOR, Config.HALF_CIRCLE_OPACITY);
				setTimelineLegendHeaderTitle(Config.TIMELINE_LEGEND_HEADER);
				setAppMessage(".timeline-message", Config.TIMELINE_MESSAGE);
				setTimelineDisabledMessageStyle(Config.TIMELINE_DISABLED_BACKGROUND_COLOR, Config.TIMELINE_DISABLED_COLOR, Config.TIMELINE_DISABLED_BACKGROUND_OPACITY);
				setAppMessage(".timelineDisableMessageContainer", Config.TIMELINE_DISABLED_MESSAGE);
				setTimelineContainerStyle(Config.TIMELINE_CONTAINER_BACKGROUND_COLOR);

				loading = dom.byId("loadingImg");
				urlQueryObject = getUrlParameters();
				initBaseMap(urlQueryObject);
				initGeocoderDijit("geocoder");
				initUrlParamData(urlQueryObject);

				on(map, "load", mapLoadedHandler);
				// TODO Temporary until a decision is made
				if (Config.MAP_CLICK_HANDLER_ON) {
					on(map, "click", mapClickHandler);
				} else {
					on(map, "extent-change", extentChangeHandler);
				}
				on(map, "update-start", showLoadingIndicator);
				on(map, "update-end", hideLoadingIndicator);
				on(document, ".share_facebook:click", shareFacebook);
				on(document, ".share_twitter:click", shareTwitter);
				on(document, ".share_bitly:click", requestBitly);
				on(document, "click", documentClickHandler);

				on(geocoder, "find-results", function (results) {
					//console.log(results);
				});
				on(geocoder, "select", function (results) {
					//console.log(results);
				});

				columns = [
					{
						label:" ",
						field:"objID",
						hidden:true
					},
					{
						label:" ",
						field:"name",
						renderCell:thumbnailRenderCell
					},
					editor({
						label:" ",
						field:"transparency",
						editorArgs:{
							value:1.0,
							minimum:0,
							maximum:1.0,
							intermediateChanges:true
						}
					}, HorizontalSlider)
				];

				grid = new (declare([Grid, Selection, DnD, Keyboard]))({
					store:store = createOrderedStore(storeData, {
						idProperty:"objID"
					}),
					columns:columns,
					showHeader:false,
					selectionMode:"single",
					dndParams:{
						singular:true
					},
					getObjectDndType:function (item) {
						return [item.type ? item.type : this.dndSourceType];
					}
				}, "grid");

				grid.on("dgrid-datachange", gridDataChangeListener);
				grid.on(mouseUtil.enterCell, dgridEnterCellHandler);
				grid.on(mouseUtil.leaveCell, dgridLeaveCellHandler);

				// timeline options
				timelineOptions = {
					"width":"100%",
					"height":Config.TIMELINE_HEIGHT + "px",
					"style":Config.TIMELINE_STYLE,
					"showNavigation":Config.TIMELINE_SHOW_NAVIGATION,
					"max":new Date(Config.TIMELINE_MAX_DATE, 0, 0),
					"min":new Date(Config.TIMELINE_MIN_DATE, 0, 0),
					"scale":links.Timeline.StepDate.SCALE.YEAR,
					"step":Config.TIMELINE_STEP,
					"stackEvents":true,
					"zoomMax":Config.TIMELINE_ZOOM_MAX,
					"zoomMin":Config.TIMELINE_ZOOM_MIN,
					"cluster":Config.TIMELINE_CLUSTER,
					"animate":Config.TIMELINE_ANIMATE
				};

				legendNode = query(".topo-legend")[0];
				array.forEach(Config.TIMELINE_LEGEND_VALUES, buildLegend);

				watchSplitters(registry.byId("main-window"));
			});

			function documentClickHandler(e) {
				if (!$("#bitlyIcon").is(e.target) && !$("#bitlyInput").is(e.target) && !$(".popover-content").is(e.target)) {
					$(".popover").hide();
				}
			}

			function buildLegend(legendItem) {
				var node = domConstruct.toDom('<label data-scale="' + legendItem.value + '" data-placement="right" class="btn toggle-scale active" style="background-color: ' + legendItem.color + '">' +
						'<input type="checkbox" name="options"><span data-scale="' + legendItem.value + '">' + legendItem.label + '</span>' +
						'</label>');

				if (urlQueryObject) {
					var _tmpFilters = urlQueryObject.f.split("|");
					var num = number.format(legendItem.value, {
						places:0,
						pattern:'#'
					});
					var i = _tmpFilters.indexOf(num);
					if (_tmpFilters[i] !== undefined) {
						domClass.toggle(node, "sel");
						domStyle.set(node, "opacity", "0.3");
						filter.push(_tmpFilters[i]);
					} else {
						//
					}
				}

				on(node, "click", function (evt) {
					var selectedScale = evt.target.getAttribute("data-scale");
					domClass.toggle(this, "sel");
					if (domClass.contains(this, "sel")) {
						var j = filter.indexOf(selectedScale);
						if (j === -1) {
							filter.push(selectedScale);
						}
						domStyle.set(this, "opacity", "0.3");
						filterSelection.push(selectedScale);
					} else {
						var k = filter.indexOf(selectedScale);
						if (k !== -1) {
							filter.splice(k, 1);
						}
						domStyle.set(this, "opacity", "1.0");
						var i = filterSelection.indexOf(selectedScale);
						if (i != -1) {
							filterSelection.splice(i, 1);
						}
					}
					drawTimeline(timelineData);
				});
				domConstruct.place(node, legendNode);
			}

			function watchSplitters(bc) {
				var moveConnects = {};
				array.forEach(["bottom"], function (region) {
					var spl = bc.getSplitter(region);
					aspect.after(spl, "_startDrag", function () {
						domStyle.set(spl.child.domNode, "opacity", "0.4");
						/*moveConnects[spl.widgetId] = on(spl.domNode, "mousemove", function (evt) {
						 console.log(evt.y);
						 var vs = win.getBox();
						 console.log(vs.h - evt.y);
						 });*/
					});
					aspect.after(spl, "_stopDrag", function () {
						domStyle.set(spl.child.domNode, "opacity", "1.0");
						var node = dom.byId("timeline-container");
						var computedStyle = domStyle.getComputedStyle(node);
						timelineContainerGeometry = domGeom.getContentBox(node, computedStyle);
						/*if (timelineContainerGeometry.h < 200) {
						 var n = registry.byId("timeline-container").domNode;
						 fx.animateProperty({
						 node:n,
						 duration:1000,
						 properties:{
						 height: {
						 end: 310
						 }
						 },
						 onEnd:function () {
						 registry.byId("main-window").layout();
						 }
						 }).play();
						 }*/
						//moveConnects[spl.widgetId].remove();
						//delete moveConnects[spl.widgetId];
					});
				});
			}

			function showLoadingIndicator() {
				esri.show(loading);
				map.disableMapNavigation();
			}

			function hideLoadingIndicator() {
				esri.hide(loading);
				map.enableMapNavigation();
			}

			function getUrlParameters() {
				var urlObject = urlUtils.urlToObject(window.location.href);
				return urlObject.query;
			}

			function initUrlParamData(urlQueryObject) {
				if (urlQueryObject) {
					if (urlQueryObject.oids.length > 0) {
						var qt = new QueryTask(IMAGE_SERVICE_URL);
						var q = new Query();
						q.returnGeometry = true;
						q.outFields = OUTFIELDS;
						var deferreds = [];
						array.forEach(urlQueryObject.oids.split("|"), function (oid) {
							var deferred = new Deferred();
							q.where = "OBJECTID = " + oid;
							deferred = qt.execute(q).addCallback(function (rs) {
								var feature = rs.features[0];
								return deferred.resolve(feature);
							});
							deferreds.push(deferred);
						});// END forEach

						var layers = [];
						all(deferreds).then(function (results) {
							var downloadIds = urlQueryObject.dlids.split("|");
							array.forEach(results, function (feature, index) {
								var objID = feature.attributes.OBJECTID;
								var extent = feature.geometry.getExtent();
								var mapName = feature.attributes.Map_Name;
								var dateCurrent = feature.attributes.DateCurrent;

								if (dateCurrent === null)
									dateCurrent = Config.MSG_UNKNOWN;
								var scale = feature.attributes.Map_Scale;
								scale = number.format(scale, {
									places:0
								});

								var mosaicRule = new MosaicRule({
									"method":MosaicRule.METHOD_CENTER,
									"ascending":true,
									"operation":MosaicRule.OPERATION_FIRST,
									"where":"OBJECTID = " + objID
								});

								params = new ImageServiceParameters();
								params.noData = 0;
								params.mosaicRule = mosaicRule;
								imageServiceLayer = new ArcGISImageServiceLayer(IMAGE_SERVICE_URL, {
									imageServiceParameters:params,
									opacity:1.0
								});
								layers.push(imageServiceLayer);

								store.put({
									id:"1",
									objID:objID,
									layer:imageServiceLayer,
									name:mapName,
									imprintYear:dateCurrent,
									scale:scale,
									downloadLink:DOWNLOAD_PATH + downloadIds[index],
									extent:extent
								});
							});// End forEach
							return layers.reverse();
						}).then(function (layers) {
									array.forEach(layers, function (layer, index) {
										map.addLayer(layer, index + 1);
									});
								});
						showGrid();
					}
				}
			}

			function setSharingUrl() {
				var lat = map.extent.getCenter().getLatitude();
				var lng = map.extent.getCenter().getLongitude();
				var zoomLevel = map.getLevel();
				var timelineDateRange = timeline.getVisibleChartRange();
				var objectIDs = "";
				var downloadIDs = "";
				query('.dgrid-row', grid.domNode).forEach(function (node) {
					var row = grid.row(node);
					objectIDs += row.data.objID + "|";
					downloadIDs += row.data.downloadLink.split("=")[1] + "|";
				});
				objectIDs = objectIDs.substr(0, objectIDs.length - 1);
				downloadIDs = downloadIDs.substr(0, downloadIDs.length - 1);

				var filters = "";
				array.forEach(filterSelection, function (filter) {
					filters += filter + "|";
				});
				filters = filters.substr(0, filters.length - 1);

				var minDate = new Date(timelineDateRange.start);
				var maxDate = new Date(timelineDateRange.end);

				var protocol = window.location.protocol;
				var host = window.location.host;
				var pathName = window.location.pathname;
				var fileName = "";
				var pathArray = window.location.pathname.split('/');
				if (pathArray[pathArray.length - 1] !== "index.html") {
					fileName = "index.html";
				} else {
					fileName = "";
				}

				sharingUrl = protocol + "//" + host + pathName + fileName +
						"?lat=" + lat + "&lng=" + lng + "&zl=" + zoomLevel +
						"&minDate=" + minDate.getFullYear() + "&maxDate=" + maxDate.getFullYear() +
						"&oids=" + objectIDs +
						"&dlids=" + downloadIDs +
						"&f=" + filters;

				return sharingUrl;
			}

			function filterData(dataToFilter, filter) {
				var filteredData = [];
				var exclude = false;
				array.forEach(dataToFilter, function (item) {
					for (var i = 0; i < filter.length; i++) {
						var currentFilter = number.parse(filter[i]);
						var currentScale = item.scale;
						var filterPosition = array.indexOf(scales, currentFilter);

						var lowerBound, upperBound, current;
						if (filterPosition !== -1) {
							if (TOPO_MAP_SCALES[filterPosition + 1] !== undefined) {
								lowerBound = TOPO_MAP_SCALES[(filterPosition + 1)].value;
							} else {
								lowerBound = "";
							}

							if (TOPO_MAP_SCALES[filterPosition].value) {
								current = TOPO_MAP_SCALES[filterPosition].value;
							}

							if (TOPO_MAP_SCALES[(filterPosition - 1)] !== undefined) {
								upperBound = TOPO_MAP_SCALES[(filterPosition - 1)].value;
							} else {
								upperBound = "";
							}
						}

						if (lowerBound === "") {
							if (currentScale <= currentFilter) {
								exclude = true;
								break;
							}
						}

						if (upperBound === "") {
							if (currentScale >= currentFilter) {
								exclude = true;
								break;
							}
						}

						if (lowerBound !== "" && upperBound !== "") {
							if (currentScale > lowerBound && currentScale < upperBound) {
								exclude = true;
								break;
							}
						}
					}

					if (!exclude) {
						filteredData.push(item);
					}
					exclude = false;
				});
				return filteredData;
			}

			function mapClickHandler(evt) {
				var currentMapExtent = map.extent;
				var lod = map.getLevel();
				runQuery(currentMapExtent, lod);
			}

			function extentChangeHandler(evt) {
				var currentMapExtent = evt.extent;
				var lod = evt.lod.level;
				runQuery(currentMapExtent, lod);
			}

			function runQuery(currentMapExtent, lod) {
				if (lod > Config.ZOOM_LEVEL_THRESHHOLD) {
					domStyle.set("timeline", "opacity", "1.0");
					query(".timelineDisableMessageContainer").style("display", "none");

					var qt = new QueryTask(Config.TOPO_INDEX);
					var q = new Query();
					q.returnGeometry = true;
					q.outFields = OUTFIELDS;
					q.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
					q.where = "IsDefault = 1";
					q.geometry = currentMapExtent.expand(Config.EXTENT_EXPAND);

					var deferred = qt.execute(q).addCallback(function (response) {
						timelineData = [];
						var nFeatures = response.features.length;
						if (nFeatures > 0) {
							array.forEach(response.features, function (feature) {
								var ext = feature.geometry.getExtent();
								var xmin = ext.xmin;
								var xmax = ext.xmax;
								var ymin = ext.ymin;
								var ymax = ext.ymax;

								var objID = feature.attributes.SvcOID;
								var mapName = feature.attributes.Map_Name;
								var scale = feature.attributes.Map_Scale;
								var dateCurrent = feature.attributes.DateCurren;
								var imprintYear = feature.attributes.Imprint_Ye;
								var downloadLink = feature.attributes.Download_G;
								var citation = feature.attributes.Citation;

								// TODO Hard-coded for now
								var className = "";
								if (scale <= TOPO_MAP_SCALES[4].value) {
									className = "one";
								} else if (scale > TOPO_MAP_SCALES[4].value && scale <= TOPO_MAP_SCALES[3].value) {
									className = "two";
								} else if (scale > TOPO_MAP_SCALES[3].value && scale <= TOPO_MAP_SCALES[2].value) {
									className = "three";
								} else if (scale > TOPO_MAP_SCALES[2].value && scale <= TOPO_MAP_SCALES[1].value) {
									className = "four";
								} else if (scale >= TOPO_MAP_SCALES[0].value) {
									className = "five";
								}

								var tooltipContent = "",
										timelineItemContent = "";
								if (lod >= Config.THUMBNAIL_VISIBLE_THRESHHOLD) {
									tooltipContent = "<img class='tooltipThumbnail' src='" + Config.IMAGE_SERVER + objID + Config.INFO_THUMBNAIL + Config.INFO_THUMBNAIL_TOKEN + "'>" +
											"<div class='tooltipContainer'>" +
											"<div class='tooltipHeader'>" + mapName + " (" + dateCurrent + ")</div>" +
											"<div class='tooltipContent'>" + citation + "</div></div>";

									timelineItemContent = '<div class="timelineItemTooltip withThumbnail" title="' + tooltipContent + '" data-xmin="' + xmin + '" data-ymin="' + ymin + '" data-xmax="' + xmax + '" data-ymax="' + ymax + '">' +
											'<span class="thumbnailLabel">' + mapName + '</span><br >' +
											'<img class="timeline-content-image" data-tooltip="' + mapName + '" data-scale="' + scale + '" data-dateCurrent="' + dateCurrent + '" data-imprintYear="' + imprintYear + '" src="' + Config.IMAGE_SERVER + objID + Config.INFO_THUMBNAIL + Config.INFO_THUMBNAIL_TOKEN + '"></div>';
								} else {
									tooltipContent = "<div class='tooltipContainer'>" +
											"<div class='tooltipHeader'>" + mapName + " (" + dateCurrent + ")</div>" +
											"<div class='tooltipContent'>" + citation + "</div></div>";
									timelineItemContent = '<div class="timelineItemTooltip noThumbnail" title="' + tooltipContent + '" data-xmin="' + xmin + '" data-ymin="' + ymin + '" data-xmax="' + xmax + '" data-ymax="' + ymax + '">' +
											'<span class="thumbnailLabel">' + mapName + '</span>';
								}

								timelineData.push({
									"start":new Date(dateCurrent, 0, 0),
									"content":timelineItemContent,
									"objID":objID,
									"downloadLink":downloadLink,
									"scale":scale,
									"className":className
								});
							}); // END forEach
						} else {

						}
						drawTimeline(timelineData);
					}); // END QUERY
				} else {
					domStyle.set("timeline", "opacity", "0.65");
					query(".timelineDisableMessageContainer").style("display", "block");
				}
			}

			function mapLoadedHandler() {
				console.log("mapLoadedHandler");
			}

			function thumbnailRenderCell(object, data, td, options) {
				var objID = object.objID;
				var mapName = object.name;
				var imprintYear = object.imprintYear;
				var downloadLink = object.downloadLink;
				var imgSrc = Config.IMAGE_SERVER + objID + Config.INFO_THUMBNAIL + Config.INFO_THUMBNAIL_TOKEN;

				var tooltipContent = "<span class='tooltipContainer'>" + mapName + "</span>";

				var node = domConstruct.create("div", {
					"class":"renderedCell",
					"innerHTML":"<button class='rm-layer-btn' data-objectid='" + objID + "'> X </button>" +
							"<img class='rm-layer-icon' src='" + imgSrc + "'>" +
							"<div class='thumbnailMapName'>" + mapName + "</div>" +
							"<div class='thumbnailMapImprintYear'>" + imprintYear + "</div>" +
							"<div class='downloadLink'><a href='" + downloadLink + "' target='_parent'>download map</a></div>",
					onclick:function (evt) {
						var objID = evt.target.getAttribute("data-objectid");
						var storeObj = store.query({
							objID:objID
						});

						map.removeLayer(storeObj[0].layer);
						store.remove(objID);
						if (store.data.length < 1) {
							hideGrid();
							map.graphics.remove(mouseOverGraphic);
							map.graphics.clear();

						}
					}
				});
				return node;
			}

			function drawTimeline(data) {
				var filteredData = filterData(data, filter);

				topic.subscribe("/dnd/drop", function (source, nodes, copy, target) {
					var layers = [];
					query(".dgrid-row").forEach(function (node) {
						var row = target.grid.row(node);
						if (row) {
							layers.push(row.data.layer);
							map.removeLayer(row.data.layer);
						}
					});

					var j = layers.length;
					while (j >= 0) {
						map.addLayer(layers[j]);
						j--;
					}
				});

				if (timeline === undefined) {
					if (urlQueryObject) {
						timelineOptions.start = new Date(urlQueryObject.minDate, 0, 0);
						timelineOptions.end = new Date(urlQueryObject.maxDate, 0, 0);
					}
					timeline = new links.Timeline(dom.byId("timeline"));
					timeline.draw(filteredData, timelineOptions);
					links.events.addListener(timeline, "ready", onTimelineReady);
					links.events.addListener(timeline, "select", onSelect);
				} else {
					var height = timelineContainerGeometry ? timelineContainerGeometry.h : Config.TIMELINE_HEIGHT;
					timelineOptions.style = "box";
					timelineOptions.height = height + "px";
					timeline.draw(filteredData, timelineOptions);
					//timeline.setData(filteredData);
					//timeline.redraw();
				}

				$(".timelineItemTooltip").tooltipster({
					theme:"tooltipster-shadow",
					contentAsHTML:true,
					position:"right",
					offsetY:20
				});

				$(".timeline-event").mouseenter(function (evt) {
					// TODO IE / What a mess!
					var xmin,
							ymin,
							xmax,
							ymax,
							extent,
							sfs;
					if (evt.target.children[0].children[0].getAttribute("data-xmin")) {
						xmin = evt.target.children[0].children[0].getAttribute("data-xmin");
						xmax = evt.target.children[0].children[0].getAttribute("data-xmax");
						ymin = evt.target.children[0].children[0].getAttribute("data-ymin");
						ymax = evt.target.children[0].children[0].getAttribute("data-ymax");
						extent = new Extent(xmin, ymin, xmax, ymax, new SpatialReference({ wkid:102100 }));
						sfs = createMouseOverGraphic(
								new Color([Config.IMAGE_BORDER_COLOR_R, Config.IMAGE_BORDER_COLOR_G, Config.IMAGE_BORDER_COLOR_B, Config.IMAGE_BORDER_OPACITY]),
								new Color([Config.IMAGE_FILL_COLOR_R, Config.IMAGE_FILL_COLOR_G, Config.IMAGE_FILL_COLOR_B, Config.IMAGE_FILL_OPACITY]));
						mouseOverGraphic = new Graphic(extent, sfs);
						map.graphics.add(mouseOverGraphic);
					}
					// TODO
					var data = evt.currentTarget.childNodes[0].childNodes[0].dataset;
					if (data) {
						extent = new Extent(data.xmin, data.ymin, data.xmax, data.ymax, new SpatialReference({ wkid:102100 }));
						sfs = createMouseOverGraphic(
								new Color([Config.IMAGE_BORDER_COLOR_R, Config.IMAGE_BORDER_COLOR_G, Config.IMAGE_BORDER_COLOR_B, Config.IMAGE_BORDER_OPACITY]),
								new Color([Config.IMAGE_FILL_COLOR_R, Config.IMAGE_FILL_COLOR_G, Config.IMAGE_FILL_COLOR_B, Config.IMAGE_FILL_OPACITY]));
						mouseOverGraphic = new Graphic(extent, sfs);
						map.graphics.add(mouseOverGraphic);
					}
				}).mouseleave(function () {
							map.graphics.clear();
						});
			}

			function onSelect() {
				var sel = timeline.getSelection();
				if (sel.length) {
					if (sel[0].row !== undefined) {
						var row = sel[0].row;
						var objID = timelineData[row].objID;
						// check to see if the timeline item is currently selected
						var objIDs = store.query({
							objID:objID
						});

						if (objIDs.length < 1) {
							var downloadLink = timelineData[row].downloadLink;
							var whereClause = "OBJECTID = " + objID;
							var qt = new QueryTask(IMAGE_SERVICE_URL);
							var q = new Query();
							q.returnGeometry = false;
							q.outFields = OUTFIELDS;
							q.where = whereClause;
							qt.execute(q, function (rs) {
								var extent = rs.features[0].geometry.getExtent();
								var mapName = rs.features[0].attributes.Map_Name;
								var dateCurrent = rs.features[0].attributes.DateCurrent;

								if (dateCurrent === null)
									dateCurrent = Config.MSG_UNKNOWN;
								var scale = rs.features[0].attributes.Map_Scale;
								scale = number.format(scale, {
									places:0
								});

								var mosaicRule = new MosaicRule({
									"method":MosaicRule.METHOD_CENTER,
									"ascending":true,
									"operation":MosaicRule.OPERATION_FIRST,
									"where":whereClause
								});
								params = new ImageServiceParameters();
								params.noData = 0;
								params.mosaicRule = mosaicRule;
								imageServiceLayer = new ArcGISImageServiceLayer(IMAGE_SERVICE_URL, {
									imageServiceParameters:params,
									opacity:1.0
								});
								map.addLayer(imageServiceLayer);

								var _firstRow;
								if (query(".dgrid-row", grid.domNode)[0]) {
									var rowId = query(".dgrid-row", grid.domNode)[0].id;
									_firstRow = rowId.split("-")[2];
								}
								var firstRowObj = store.query({
									objID:_firstRow
								});

								store.put({
									id:"1",
									objID:objID,
									layer:imageServiceLayer,
									name:mapName,
									imprintYear:dateCurrent,
									scale:scale,
									downloadLink:downloadLink,
									extent:extent
								}, {
									before:firstRowObj[0]
								});
							}); // END execute
							showGrid();
						} else {
							// already in the store/added to the map
						}
					}
				}
			}

			function onTimelineReady() {
				console.log("TIMELINE READY");
			}

			function createOrderedStore(data, options) {
				// Instantiate a Memory store modified to support ordering.
				return Observable(new Memory(lang.mixin({data:data,
					idProperty:"id",
					put:function (object, options) {
						object.id = calculateOrder(this, object, options && options.before);
						return Memory.prototype.put.call(this, object, options);
					},
					// Memory's add does not need to be augmented since it calls put
					copy:function (object, options) {
						// summary:
						//		Given an item already in the store, creates a copy of it.
						//		(i.e., shallow-clones the item sans id, then calls add)
						var k, obj = {}, id, idprop = this.idProperty, i = 0;
						for (k in object) {
							obj[k] = object[k];
						}
						// Ensure unique ID.
						// NOTE: this works for this example (where id's are strings);
						// Memory should autogenerate random numeric IDs, but
						// something seems to be falling through the cracks currently...
						id = object[idprop];
						if (id in this.index) {
							// rev id
							while (this.index[id + "(" + (++i) + ")"]) {
							}
							obj[idprop] = id + "(" + i + ")";
						}
						this.add(obj, options);
					},
					query:function (query, options) {
						options = options || {};
						options.sort = [
							{attribute:"id"}
						];
						return Memory.prototype.query.call(this, query, options);
					}
				}, options)));
			}

			function calculateOrder(store, object, before, orderField) {
				// Calculates proper value of order for an item to be placed before another
				var afterOrder,
						beforeOrder = 0;
				if (!orderField) {
					orderField = "id";
				}

				if (before) {
					// calculate midpoint between two items' orders to fit this one
					afterOrder = before[orderField];
					store.query({}, {}).forEach(function (object) {
						var ord = object[orderField];
						if (ord > beforeOrder && ord < afterOrder) {
							beforeOrder = ord;
						}
					});
					return (afterOrder + beforeOrder) / 2;
				} else {
					// find maximum order and place this one after it
					afterOrder = 0;
					store.query({}, {}).forEach(function (object) {
						var ord = object[orderField];
						if (ord > afterOrder) {
							afterOrder = ord;
						}
					});
					return afterOrder + 1;
				}
			}

			function initBaseMap(urlQueryObject) {
				var _lat, _lng, _lod;
				if (urlQueryObject) {
					_lat = urlQueryObject.lat;
					_lng = urlQueryObject.lng;
					_lod = urlQueryObject.zl;
				} else {
					_lat = Config.BASEMAP_INIT_LAT;
					_lng = Config.BASEMAP_INIT_LNG;
					_lod = Config.BASEMAP_INIT_ZOOM;
				}
				map = new Map("map", {
					basemap:Config.BASEMAP_STYLE,
					center:[_lng, _lat],
					zoom:_lod
				});
			}

			function initGeocoderDijit(srcRef) {
				geocoder = new Geocoder({
					map:map,
					autoComplete:true,
					showResults:true,
					searchDelay:250,
					arcgisGeocoder:{
						placeholder:Config.GEOCODER_PLACEHOLDER_TEXT
					}
				}, srcRef);
				geocoder.startup();
			}

			function createMouseOverGraphic(borderColor, fillColor) {
				var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, borderColor, Config.IMAGE_BORDER_WIDTH), fillColor);
				return sfs;
			}

			function hideGrid() {
				fadeIn(".stepOne");
				fadeIn(".timeline-message");
				$(".stepTwo").css("display", "none");
				$(".gridContainer").css("display", "none");
			}

			function showGrid() {
				fadeOut(".stepOne");
				fadeOut(".timeline-message");
				$(".stepTwo").css("display", "block");
				$(".gridContainer").css("display", "block");
			}

			function gridDataChangeListener(evt) {
				evt.cell.row.data.layer.setOpacity(evt.value);
				//console.log("cell: ", evt.cell, evt.cell.row.id, evt.cell.row.data.layer);
			}

			function dgridEnterCellHandler(evt) {
				if (mouseOverGraphic)
					map.graphics.remove(mouseOverGraphic);
				var row = grid.row(evt);
				var extent = row.data.extent;
				var sfs = createMouseOverGraphic(
						new Color([Config.IMAGE_BORDER_COLOR_R, Config.IMAGE_BORDER_COLOR_G, Config.IMAGE_BORDER_COLOR_B, Config.IMAGE_BORDER_OPACITY]),
						new Color([Config.IMAGE_FILL_COLOR_R, Config.IMAGE_FILL_COLOR_G, Config.IMAGE_FILL_COLOR_B, Config.IMAGE_FILL_OPACITY]));
				mouseOverGraphic = new Graphic(extent, sfs);
				map.graphics.add(mouseOverGraphic);
				//var slider = query(".dijitSliderH")[0];
				//domStyle.set(slider, "opacity", "1.0");
			}

			function dgridLeaveCellHandler(evt) {
				map.graphics.remove(mouseOverGraphic);
				map.graphics.clear();
				//var slider = query(".dijitSliderH")[0];
				//domStyle.set(slider, "opacity", "0.35");
			}

			function setAppHeaderStyle(txtColor, backgroundColor) {
				query(".header").style("color", txtColor);
				query(".header").style("background-color", backgroundColor);
			}

			function setAppHeaderTitle(str) {
				query(".header-title")[0].innerHTML = str;
			}

			function setAppHeaderSubtitle(str) {
				query(".subheader-title")[0].innerHTML = str;
			}

			function setAppMessage(node, str) {
				query(node)[0].innerHTML = str;
			}

			function setTimelineLegendHeaderTitle(str) {
				query(".timeline-legend-header")[0].innerHTML = str;
			}

			function setHalfCircleStyle(backgroundColor, color, opacity) {
				query(".halfCircleRight").style("backgroundColor", backgroundColor);
				query(".halfCircleRight").style("color", color);
				query(".halfCircleRight").style("opacity", opacity);
			}

			function setTimelineContainerStyle(backgroundColor) {
				domStyle.set(dom.byId("timeline-container"), "backgroundColor", backgroundColor);
			}

			function setTimelineDisabledMessageStyle(backgroundColor, color, opacity) {
				query(".timelineDisableMessageContainer").style("backgroundColor", backgroundColor);
				query(".timelineDisableMessageContainer").style("color", color);
				query(".timelineDisableMessageContainer").style("opacity", opacity);
			}


			function fadeIn(node) {
				var _node = query(node)[0];
				var fadeArgs = {
					node:_node,
					duration:600
				};
				fx.fadeIn(fadeArgs).play();
			}

			function fadeOut(node) {
				var _node = query(node)[0];
				var fadeArgs = {
					node:_node,
					duration:600
				};
				fx.fadeOut(fadeArgs).play();
			}

			/**********
			 *
			 **********/
			function shareFacebook() {
				var url = setSharingUrl();
				var options = '&p[title]=' + encodeURIComponent($('#title').text())
						+ '&p[summary]=' + encodeURIComponent($('#subtitle').text())
						+ '&p[url]=' + encodeURIComponent(url)
						+ '&p[images][0]=' + encodeURIComponent($("meta[property='og:image']").attr("content"));

				window.open('http://www.facebook.com/sharer.php?s=100' + options, 'Facebook sharing', 'toolbar=0,status=0,width=626,height=436'
				);
			}

			function shareTwitter() {
				var url = setSharingUrl();

				var bitlyUrls = [
					"http://api.bitly.com/v3/shorten?callback=?",
					"https://api-ssl.bitly.com/v3/shorten?callback=?"
				];
				var bitlyUrl = location.protocol == 'http:' ? bitlyUrls[0] : bitlyUrls[1];

				var urlParams = esri.urlToObject(url).query || {};
				var targetUrl = url;

				$.getJSON(
						bitlyUrl,
						{
							"format":"json",
							"apiKey":"R_14fc9f92e48f7c78c21db32bd01f7014",
							"login":"esristorymaps",
							"longUrl":targetUrl
						},
						function (response) {
							if (!response || !response || !response.data.url)
								return;
							$("#bitlyLoad").fadeOut();
							$("#bitlyInput").fadeIn();
							$("#bitlyInput").val(response.data.url);
							$("#bitlyInput").select();
						}
				).complete(function (data) {
							var options = 'text=' + encodeURIComponent($('#title').text()) +
									'&url=' + encodeURIComponent(data.responseJSON.data.url) +
									'&related=' + Config.SHARING_RELATED +
									'&hashtags=' + Config.SHARING_HASHTAG;
							window.open('https://twitter.com/intent/tweet?' + options, 'Tweet', 'toolbar=0,status=0,width=626,height=436');
						});
			}

			function requestBitly() {
				var url = setSharingUrl();
				var bitlyUrls = [
					"http://api.bitly.com/v3/shorten?callback=?",
					"https://api-ssl.bitly.com/v3/shorten?callback=?"
				];
				var bitlyUrl = location.protocol == 'http:' ? bitlyUrls[0] : bitlyUrls[1];

				var urlParams = esri.urlToObject(url).query || {};
				var targetUrl = url;

				$.getJSON(
						bitlyUrl,
						{
							"format":"json",
							"apiKey":"R_14fc9f92e48f7c78c21db32bd01f7014",
							"login":"esristorymaps",
							"longUrl":targetUrl
						},
						function (response) {
							if (!response || !response || !response.data.url)
								return;
							$("#bitlyLoad").fadeOut();
							$("#bitlyInput").fadeIn();
							$("#bitlyInput").val(response.data.url);
							$("#bitlyInput").select();
						}
				);
				$(".popover").show();
			}
		});