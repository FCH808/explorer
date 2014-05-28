require([
	"dojo/_base/array",
	"dojo/_base/declare",
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
	"esri/geometry/Point",
	"esri/geometry/Polygon",
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
		function (array, declare, lang, win, Deferred, aspect, dom, domAttr, domClass, domConstruct, domGeom, domStyle, ioQuery, json, mouse, number, on, parser, query, ready, topic, Observable, Memory, win, DnD, Grid, editor, Selection, Keyboard, mouseUtil, Button, HorizontalSlider, BorderContainer, ContentPane, registry, arcgisUtils, Geocoder, Point, Polygon, Extent, SpatialReference, Graphic, ArcGISDynamicMapServiceLayer, ArcGISImageServiceLayer, ImageServiceParameters, MosaicRule, Map, SimpleFillSymbol, SimpleLineSymbol, Color, Query, QueryTask, urlUtils) {

			var map,
					currentMapExtent,

					TOPO_MAP_SCALES,
					OUTFIELDS,
					PARAMS = '?self?culture=en&f=json&token=',
					TOKEN,
					IMAGE_SERVICE_URL,
					imageServiceLayer,

			// dgrid store
					store,
					storeData = [],

			// dgrid
					grid,
			// dgrid columns
					columns,
					lastObjAdded,
					mouseOverGraphic,

			// timeline data and filters
					timeline,
					timelineOptions,
					timelineData = [],
					filter = [],

			// URL params
					fpx,
					fpy,

					extentGraphic,

					TIMELINE_VISIBLE,
			// sharing URL
					sharingUrl,
					urlObject,
					urlQueryObject,
			// loading icon
					loading,

			// timeline container dimensions
					timelineContainerGeometry,
					filteredArray;

			ready(function () {
				parser.parse();
				OUTFIELDS = Config.OUTFIELDS;
				TOPO_MAP_SCALES = Config.SCALES;
				TOKEN = Config.TOKEN;
				IMAGE_SERVICE_URL = 'http://historical1.arcgis.com/arcgis/rest/services/USA_Historical_Topo_Maps/ImageServer?self?culture=en&f=json&token=' + TOKEN;
				TIMELINE_VISIBLE = false;

				query(".header-title")[0].innerHTML = Config.APP_HEADER;
				query(".subheader-title")[0].innerHTML = Config.APP_SUBHEADER;
				query(".timeline-legend-header")[0].innerHTML = Config.TIMELINE_LEGEND_HEADER;

				checkUrlParams();
				initMap(urlQueryObject);
				initGeocoderDijit("geocoder");

				loading = dom.byId("loadingImg");

				on(map, "load", mapLoadedHandler);
				on(map, "extent-change", extentChangeHandler);
				on(map, "update-start", showLoading);
				on(map, "update-end", hideLoading);
				on(query(".share")[0], 'click', setSharingUrl);

				columns = [
					{
						label:' ',
						field:'objID',
						hidden:true
					},
					{
						label:' ',
						field:'name',
						renderCell:thumbnailRenderCell
					},
					editor({
						label:' ',
						field:'transparency',
						editorArgs:{
							value:1.0,
							minimum:0,
							maximum:1.0,
							intermediateChanges:true
						}
					}, HorizontalSlider)
				];

				/*store = new Observable(new Memory({
				 data: storeData
				 }));*/

				grid = new (declare([Grid, Selection, DnD, Keyboard]))({
					store:store = createOrderedStore(storeData, {
						idProperty:'objID'
					}),
					columns:columns,
					showHeader:false,
					selectionMode:'single',
					dndParams:{
						singular:true
					},
					getObjectDndType:function (item) {
						return [item.type ? item.type : this.dndSourceType];
					}
				}, 'grid');

				grid.on('dgrid-datachange', function (evt) {
					evt.cell.row.data.layer.setOpacity(evt.value);
					//console.log("cell: ", evt.cell, evt.cell.row.id, evt.cell.row.data.layer);
				});

				grid.on(mouseUtil.enterCell, function (event) {
					if (mouseOverGraphic)
						map.graphics.remove(mouseOverGraphic);
					var row = grid.row(event);
					var extent = row.data.extent;
					var sfs = createMouseOverGraphic(new Color([8, 68, 0, 1.0]), new Color([255, 255, 0, 0.0]));
					mouseOverGraphic = new Graphic(extent, sfs);
					map.graphics.add(mouseOverGraphic);
				});

				grid.on(mouseUtil.leaveCell, function (event) {
					if (mouseOverGraphic)
						map.graphics.remove(mouseOverGraphic);
				});

				// timeline options
				timelineOptions = {
					'width':'100%',
					'height':Config.TIMELINE_HEIGHT,
					'style':Config.TIMELINE_STYLE,
					'showNavigation':Config.TIMELINE_SHOW_NAVIGATION,
					'max':new Date(Config.TIMELINE_MAX_DATE, 0, 0),
					'min':new Date(Config.TIMELINE_MIN_DATE, 0, 0),
					'scale':links.Timeline.StepDate.SCALE.YEAR,
					'step':Config.TIMELINE_STEP,
					'stackEvents':true,
					'zoomMax':Config.TIMELINE_ZOOM_MAX,
					'zoomMin':Config.TIMELINE_ZOOM_MIN,
					'cluster':Config.TIMELINE_CLUSTER,
					'animate':Config.TIMELINE_ANIMATE
				};

				var buttons = query(".toggle-scale");
				on(buttons, "click", function () {
					domClass.toggle(this, "sel");
					var selectedItem;
					array.forEach(buttons, function (e, i) {
						selectedItem = domAttr.get(e, "class").split(' ')[2];
						if (domClass.contains(e, "sel")) {
							var j = filter.indexOf(selectedItem);
							if (j === -1) {
								filter.push(selectedItem);
							}
							domStyle.set(e, "opacity", "0.3");
						} else {
							var k = filter.indexOf(selectedItem);
							if (k !== -1) {
								filter.splice(k, 1);
							}
							domStyle.set(e, "opacity", "01.0");
						}
					});
					drawTimeline(timelineData);
				});

				watchSplitters(registry.byId("main-window"));
			});

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
						domStyle.set(spl.child.domNode, "opacity", 1);
						//var vs = win.getBox();
						var node = dom.byId("timeline-container");
						var computedStyle = domStyle.getComputedStyle(node);
						timelineContainerGeometry = domGeom.getContentBox(node, computedStyle);
						//moveConnects[spl.widgetId].remove();
						//delete moveConnects[spl.widgetId];
					});
				});
			}

			function showLoading() {
				esri.show(loading);
				map.disableMapNavigation();
				map.hideZoomSlider();
			}

			function hideLoading() {
				esri.hide(loading);
				map.enableMapNavigation();
				map.showZoomSlider();
			}

			function checkUrlParams() {
				urlObject = urlUtils.urlToObject(window.location.href);
				if (urlObject.query) {
					urlQueryObject = urlObject.query;
					initStore(urlQueryObject);
				}
			}

			function initStore() {
				var qt = new QueryTask(IMAGE_SERVICE_URL);
				var q = new Query();
				q.returnGeometry = true;
				q.outFields = OUTFIELDS;
				array.forEach(urlQueryObject.oids.split("|"), function (oid) {
					var whereStatement = "OBJECTID = " + oid;
					q.where = whereStatement;
					qt.execute(q, function (rs) {
						var feature = rs.features[0];
						var objID = feature.attributes.OBJECTID;
						var extent = feature.geometry.getExtent();
						var mapName = feature.attributes.Map_Name;
						var dateCurrent = feature.attributes.DateCurrent;

						if (dateCurrent === null)
							dateCurrent = 'unknown';
						var scale = feature.attributes.Map_Scale;
						scale = number.format(scale, {
							places:0
						});

						var mosaicRule = new MosaicRule({
							"method":MosaicRule.METHOD_CENTER,
							"ascending":true,
							"operation":MosaicRule.OPERATION_FIRST,
							"where":whereStatement
						});
						params = new ImageServiceParameters();
						params.noData = 0;
						params.mosaicRule = mosaicRule;
						imageServiceLayer = new ArcGISImageServiceLayer(IMAGE_SERVICE_URL, {
							imageServiceParameters:params,
							opacity:1.0
						});
						map.addLayer(imageServiceLayer);

						var firstRowObj = store.query({objID:lastObjAdded});
						store.put({
							id:"1",
							objID:objID,
							layer:imageServiceLayer,
							name:mapName,
							imprintYear:dateCurrent,
							scale:scale,
							downloadLink:"TODO",
							extent:extent
						}, {
							before:firstRowObj[0]
						});
						lastObjAdded = objID;
					});
				});
				$('.stepTwo').css('display', 'none');
				$('.gridContainer').css('display', 'block');
			}

			function setSharingUrl() {
				var lat = map.extent.getCenter().getLatitude();
				var lng = map.extent.getCenter().getLongitude();
				var zoomLevel = map.getLevel();
				var timelineDateRange = timeline.getDataRange();
				var selectedItems = store.data;
				var objectIDs = '';
				array.forEach(selectedItems, function (selectedItem) {
					objectIDs += selectedItem.objID + "|";
				});
				objectIDs = objectIDs.substr(0, objectIDs.length - 1);
				var minDate = new Date(timelineDateRange.min);
				var maxDate = new Date(timelineDateRange.max);
				sharingUrl = window.location.href + "index.html?lat=" + lat + "&lng=" + lng + "&zl=" + zoomLevel + "&minDate=" + minDate.getFullYear() + "&maxDate=" + maxDate.getFullYear() + "&oids=" + objectIDs;
				console.log(sharingUrl);
				window.open(sharingUrl);
			}

			function filterData(dataToFilter, filter) {
				var filteredData = [];
				var exclude = false;
				array.forEach(dataToFilter, function (item) {
					for (var i = 0; i < filter.length; i++) {
						if (item.className === filter[i]) {
							exclude = true;
							break;
						}
					}

					if (!exclude) {
						filteredData.push(item);
					}
					exclude = false;
				});
				return filteredData;
			}

			function extentChangeHandler(evt) {
				currentMapExtent = evt.extent;
				var qt = new QueryTask(Config.TOPO_INDEX);
				var q = new Query();
				q.returnGeometry = true;
				q.outFields = OUTFIELDS;
				q.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
				q.where = 'IsDefault = 1';

				/*if (extentGraphic)
				 map.graphics.remove(extentGraphic);*/
				var subExtent = currentMapExtent.expand(0.60);
				/*var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				 new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH,
				 new Color([255, 0, 0]), 1), new Color([155, 255, 0, 0]));
				 extentGraphic = new Graphic(subExtent, sfs);
				 map.graphics.add(extentGraphic);*/
				q.geometry = subExtent;

				var deferred = qt.execute(q).addCallback(function (response) {
					$('.feature-count').empty().append('(' + response.features.length + ')');
					timelineData = [];
					array.forEach(response.features, function (feature) {
						var ext = feature.geometry.getExtent();
						var xmin = ext.xmin;
						var xmax = ext.xmax;
						var ymin = ext.ymin;
						var ymax = ext.ymax;

						var objID = feature.attributes.OBJECTID;
						var mapName = feature.attributes.Map_Name;
						var scale = feature.attributes.Map_Scale;
						var dateCurrent = feature.attributes.DateCurren;
						var imprintYear = feature.attributes.Imprint_Ye;
						var downloadLink = feature.attributes.Download_G;
						var citation = feature.attributes.Citation;

						var className = '';
						if (scale <= TOPO_MAP_SCALES[0]) {
							className = 'one';
						} else if (scale > TOPO_MAP_SCALES[0] && scale <= TOPO_MAP_SCALES[1]) {
							className = 'two';
						} else if (scale > TOPO_MAP_SCALES[1] && scale <= TOPO_MAP_SCALES[2]) {
							className = 'three';
						} else if (scale > TOPO_MAP_SCALES[2] && scale <= TOPO_MAP_SCALES[3]) {
							className = 'four';
						} else if (scale > TOPO_MAP_SCALES[3]) {
							className = 'five';
						}

						var tooltipContent = "<img class='tooltipThumbnail' src='" + Config.IMAGE_SERVER + objID + Config.INFO_THUMBNAIL + Config.INFO_THUMBNAIL_TOKEN + "'>" +
								"<div class='tooltipContainer'>" +
								"<div class='tooltipHeader'>" + mapName + " (" + dateCurrent + ")</div>" +
								"<div class='tooltipContent'>" + citation + "</div></div>";
						timelineData.push({
							'start':new Date(dateCurrent, 0, 0),
							'content':'<div class="timelineItemTooltip" title="' + tooltipContent + '" data-xmin="' + xmin + '" data-ymin="' + ymin + '" data-xmax="' + xmax + '" data-ymax="' + ymax + '">' +
									'<span class="thumbnailLabel">' + mapName + '</span><br >' +
									'<img class="timeline-content-image" data-tooltip="' + mapName + '" data-scale="' + scale + '" data-dateCurrent="' + dateCurrent + '" data-imprintYear="' + imprintYear + '" src="' + Config.IMAGE_SERVER + objID + Config.INFO_THUMBNAIL + Config.INFO_THUMBNAIL_TOKEN + '"></div>',
							'objID':objID,
							'downloadLink':downloadLink,
							'className':className
						});
					}); // END forEach

					updateUI();
					//repositionMapDiv(map);
					drawTimeline(timelineData);

					var timelineEventNode = query(".timeline-event");
					on(timelineEventNode, mouse.enter, function (evt) {
						if (evt.target.getAttribute('data-xmin')) {
							var xmin = evt.target.getAttribute('data-xmin');
							var ymin = evt.target.getAttribute('data-ymin');
							var xmax = evt.target.getAttribute('data-xmax');
							var ymax = evt.target.getAttribute('data-ymax');
							var extent = new Extent(xmin, ymin, xmax, ymax, new SpatialReference({ wkid:102100 }));
							var sfs = createMouseOverGraphic(new Color([8, 68, 0]), new Color([255, 255, 0, 0.35]));
							mouseOverGraphic = new Graphic(extent, sfs);
							map.graphics.add(mouseOverGraphic);
						}
					});
					on(timelineEventNode, mouse.leave, function (evt) {
						if (mouseOverGraphic) {
							map.graphics.remove(mouseOverGraphic);
						}
					});
				}); // END QUERY
			}

			function updateUI() {
				if ($('.timelineContainer').css('display') === 'none') {
					$('.timelineContainer').css('display', 'block');
					$('.timelineLegendContainer').css('display', 'block');
					$('.stepOne').css('display', 'none');
					$('.stepTwo').css('display', 'block');
				}
			}

			function mapLoadedHandler() {
				console.log("mapLoadedHandler");
			}

			function thumbnailRenderCell(object, data, td, options) {
				var objID = object.objID;
				var mapName = object.name;
				var imprintYear = object.imprintYear;
				var scale = object.scale;
				var downloadLink = object.downloadLink;
				var imgSrc = Config.IMAGE_SERVER + objID + Config.INFO_THUMBNAIL + Config.INFO_THUMBNAIL_TOKEN;

				var node = domConstruct.create("div", {
					class:"renderedCell",
					innerHTML:"<button class='rm-layer-btn' data-objectid='" + objID + "'> X </button>" +
							"<img class='rm-layer-icon' src='" + imgSrc + "'>" +
							"<div class='thumbnailMapName'>" + mapName + "</div>" +
							"<div class='thumbnailMapImprintYear'>" + imprintYear + "</div>" +
							"<div class='thumbnailMapScale'>1 : " + scale + "</div>" +
							"<div class='downloadLink'><a href='" + downloadLink + "' target='_parent'>download</a></div>",
					onclick:function (evt) {
						var objID = evt.target.getAttribute('data-objectid');
						var storeObj = store.query({
							objID:objID
						});

						map.removeLayer(storeObj[0].layer);
						store.remove(objID);
						if (store.data.length < 1) {
							$('.gridContainer').css('display', 'none');
							$('.stepOne').css('display', 'block');
							map.graphics.remove(mouseOverGraphic);
						}
					}
				});
				return node;
			}

			function drawTimeline(data) {
				var filteredData = filterData(data, filter);

				topic.subscribe("/dnd/drop", function (source, nodes, copy, target) {
					var layers = [];
					query('.dgrid-row').forEach(function (node) {
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
					console.log("Creating TIMELINE");
					if (urlQueryObject) {
						timelineOptions.start = new Date(urlQueryObject.minDate, 0, 0);
						timelineOptions.end = new Date(urlQueryObject.maxDate, 0, 0);
					}

					timeline = new links.Timeline(dom.byId('timeline'));
					timeline.draw(filteredData, timelineOptions);
					links.events.addListener(timeline, 'ready', onTimelineReady);
					links.events.addListener(timeline, 'select', onSelect);
				} else {
					console.log("Redrawing TIMELINE");
					/*if (timelineContainerGeometry.h < 200) {
					 var timelineFrame = dom.byId("timeline-frame");
					 domStyle.set(timelineFrame, "height", "120");
					 timelineOptions.style = "dot";
					 timeline.draw(filteredData, timelineOptions);
					 } else {
					 timelineOptions.style = "box";
					 */
					timeline.setData(filteredData);
					timeline.redraw();
					//}
				}

				$('.timelineItemTooltip').tooltipster({
					theme:'tooltipster-shadow',
					contentAsHTML:true,
					position:'right',
					offsetY:20
				});
			}

			function onSelect() {
				var sel = timeline.getSelection();
				if (sel.length) {
					if (sel[0].row !== undefined) {
						var row = sel[0].row;
						var objID = timelineData[row].objID;
						// check for existing ID's
						var objIDs = store.query({
							objID:objID
						});

						if (objIDs.length < 1) {
							var downloadLink = timelineData[row].downloadLink;
							var whereClause = 'OBJECTID = ' + objID;
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
									dateCurrent = 'unknown';
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

								var firstRowObj = store.query({
									objID:lastObjAdded
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
								lastObjAdded = objID;
							});
							$('.stepOne').css('display', 'none');
							$('.gridContainer').css('display', 'block');
						} else {
							console.log(objID)
						}
					}
				}
			}

			function onTimelineReady() {
				console.log('TIMELINE READY');
			}

			function onRangeChanged(properties) {
				console.log(properties);
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

			function initMap(urlQueryObject) {
				var lat,
						lng,
						zl;
				if (urlQueryObject) {
					lat = urlQueryObject.lat;
					lng = urlQueryObject.lng;
					zl = urlQueryObject.zl;
				} else {
					lat = Config.MAP_INIT_LAT;
					lng = Config.MAP_INIT_LNG;
					zl = Config.MAP_INIT_ZOOM;
				}
				map = new Map('map', {
					basemap:'topo',
					center:[lng, lat],
					zoom:zl
				});
			}

			function initGeocoderDijit(srcRef) {
				geocoder = new Geocoder({
					map:map,
					autoComplete:true,
					showResults:true,
					placeholder:'Find a Place'
				}, srcRef);
				geocoder.startup();
			}

			function createMouseOverGraphic(borderColor, fillColor) {
				var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, borderColor, 2), fillColor);
				return sfs;
			}
		});