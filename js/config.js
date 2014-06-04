var Config = {
	"APP_HEADER": "USGS Archival Topographic Map Explorer",
	"APP_SUBHEADER": "",
	"STEP_ONE_MESSAGE":"",
	"STEP_TWO_MESSAGE":"",
	"STEP_THREE_MESSAGE":"",
	"TIMELINE_LEGEND_HEADER":"Historical Map Scales",
	"TIMELINE_LEGEND_VALUES":[{
		"label": "250,000",
		"value": 250000,
		"color": "#004ED7",
		"className":"five"
	}, {
		"label": "125,000",
		"value": 125000,
		"color": "#0075C4",
		"className":"four"
	}, {
		"label": "62,500",
		"value": 62500,
		"color": "#009CB0",
		"className":"three"
	}, {
		"label": "24,000",
		"value": 24000,
		"color": "#00C49D",
		"className":"two"
	}, {
		"label": "12,000",
		"value": 12000,
		"color": "#00EB89",
		"className":"one"
	}],

	"TOKEN": "RV6esLk-q9nBWpbAXOuvsBdpQOP0OwS_pL6_0G8EBAf2IuB_KpRFNGU_74pQunz7jybjGwh1RFtHBY-ugETNuu5c-JvPx-okF4dRuN7lKRCJVrQIQe-3RrUi2SMliDjDFmhKDl32rDiV-RCd0KQ8mt3fNqVFz3YG85YoMk6iIF6n_QZkDv5wylPPYf7LZ45e",

	"INFO_THUMBNAIL": "/info/thumbnail",
	"IMAGE_SERVER_CA": "http://usgs.esri.com:6080/arcgis/rest/services/USGS_HTMC_CA/ImageServer/",
	"MAP_SERVER_CA": "http://usgs.esri.com:6080/arcgis/rest/services/USGS_HTMC_Footprints_CA/MapServer",

	"INFO_THUMBNAIL_TOKEN": "?token=" + "RV6esLk-q9nBWpbAXOuvsBdpQOP0OwS_pL6_0G8EBAf2IuB_KpRFNGU_74pQunz7jybjGwh1RFtHBY-ugETNuu5c-JvPx-okF4dRuN7lKRCJVrQIQe-3RrUi2SMliDjDFmhKDl32rDiV-RCd0KQ8mt3fNqVFz3YG85YoMk6iIF6n_QZkDv5wylPPYf7LZ45e",
	"IMAGE_SERVER":"http://historical1.arcgis.com/arcgis/rest/services/USA_Historical_Topo_Maps/ImageServer/",
	"MAP_SERVER": "http://historical1.arcgis.com/arcgis/rest/services/USA_Historical_Topo_Maps_Index/MapServer",// + "?self?culture=en&f=json&token=" + "IkxAypOD2nEVLGKrHr-SNYiFhlUs96IGpIaH2E1xXAB-JwIqiy--IotPbsr7nWVUoR3SzCiCtxCZTTZZfKvuEGEiX6idPZ_h4oc5-A71gJs9Z5yL_AVlUpmRtCn6BtmAYTb7cLTxerg0UEuhYwDtYk54RAE1AULhOjSY8ysOP-8MMRZIocFauQxB3eVUTHJS"

	"MAP_INIT_LAT":29.939833,
	"MAP_INIT_LNG":-90.076046,
	"MAP_INIT_ZOOM":12,

	"TOPO_INDEX":"http://services.arcgis.com/YkVYBaX0zm7bsV3k/ArcGIS/rest/services/USGSTopoIndex/FeatureServer/0",

	"OUTFIELDS": ['*'],

	"MSG_UNKNOWN":"Unknown",

	"TIMELINE_STYLE": "box",
	"TIMELINE_HEIGHT": "300",
	"TIMELINE_ZOOM_MIN":201536000000,
	"TIMELINE_ZOOM_MAX":4153600000000,
	"TIMELINE_CLUSTER":false,
	"TIMELINE_SHOW_NAVIGATION":false,
	"TIMELINE_MIN_DATE":'1850',
	"TIMELINE_MAX_DATE":'2020',
	"TIMELINE_STEP":5,
	"TIMELINE_ANIMATE":true,

	"ZOOM_LEVEL_THRESHHOLD": 9,
	"THUMBNAIL_VISIBLE_THRESHHOLD": 12,

	// TMP
	"DOWNLOAD_PATH": "http://ims.er.usgs.gov/gda_services/download?item_id=",

	"IMAGE_FILL_OPACITY": 0.0,
	"IMAGE_BORDER_OPACITY": 1.0,
	"IMAGE_BORDER_WIDTH": 2.0,

	"EXTENT_EXPAND": 0.60,

	"SHARING_RELATED": "",
	"SHARING_HASHTAG": "USGS",

	"MAP_CLICK_HANDLER_ON": false
};