var Config = {
	/******** Browser window title (text that will show up in the browser bookmarks) ********/
	"APP_TITLE":"USGS Archival Topographic Map Explorer",

	/******** Application header/banner ********/
	/* Header/Banner background color (rgb or hex) */
	"APP_HEADER_BACKGROUND_COLOR":"rgb(8, 68, 0)",
	/* Header text color */
	"APP_HEADER_TEXT_COLOR":"white",
	/* Header text size */
	"APP_HEADER_TEXT_SIZE":"1.6em",
	/* Header text */
	"APP_HEADER_TEXT":"USGS Archival Topographic Map Explorer",

	/* Header text color */
	"APP_SUBHEADER_TEXT_COLOR":"white",
	/* Header text size */
	"APP_SUBHEADER_TEXT_SIZE":"0.9em",
	/* Subheader text */
	"APP_SUBHEADER_TEXT":"",

	/* Step Messages */
	"STEP_ONE_MESSAGE":"<span style='font-weight: bold'>Zoom or Search</span> to a location to explore the map collection.",
	"STEP_ONE_HALF_CIRCLE_MSG":"1",
	"STEP_TWO_MESSAGE":"<span style='font-weight: bold'>Slide</span> transparency on map to compare, or drag/drop to re-order maps.",
	"STEP_TWO_HALF_CIRCLE_MSG":"2",

	"HALF_CIRCLE_BACKGROUND_COLOR" : "#086B00",
	"HALF_CIRCLE_COLOR" : "white",
	"HALF_CIRCLE_OPACITY" : "0.5",

	/* Timeline Container */
	"TIMELINE_CONTAINER_BACKGROUND_COLOR": "rgb(242, 252, 242)",

	"TIMELINE_MESSAGE":"<span style='font-weight: bold'>Click</span> on a map title in the timeline to display the map.",

	"TIMELINE_LEGEND_HEADER":"Historical Map Scales",
	"TIMELINE_LEGEND_VALUES":[
		{
			"label":"250,000",
			"value":250000,
			"color":"#004ED7",
			"className":"five"
		},
		{
			"label":"125,000",
			"value":125000,
			"color":"#0075C4",
			"className":"four"
		},
		{
			"label":"62,500",
			"value":62500,
			"color":"#009CB0",
			"className":"three"
		},
		{
			"label":"24,000",
			"value":24000,
			"color":"#00C49D",
			"className":"two"
		},
		{
			"label":"12,000",
			"value":12000,
			"color":"#00EB89",
			"className":"one"
		}
	],

	/* Timeline disabled message (Msg displayed when user zooms too far out) */
	"TIMELINE_DISABLED_MESSAGE":"Zoom closer on the map to enable the timeline",
	"TIMELINE_DISABLED_BACKGROUND_COLOR":"#7C7C7C",
	"TIMELINE_DISABLED_COLOR":"white",
	"TIMELINE_DISABLED_BACKGROUND_OPACITY":"0.65",
	"TIMELINE_DISABLED_BACKGROUND_FONT_SIZE": "1.7em",

	"TOKEN":"04QDlTJ8GZUUva8naL0wGvh3VvkjKJj4zWvasskfpvSOmPVrEkYTYIxq9NfWVTQXcRHPRRsa__RWLSkrXutQ2l2Qsq5wp35iEnk8yvqEXT5kjmnpU4C-CC4HHnSDAUzaXTK8KG_NYRSSKTn-Hpca5NhfgvtOnj_-WblSTT7UAakJtVBs-z75mOOBEm_2TrMH",

	"INFO_THUMBNAIL":"/info/thumbnail",
	"IMAGE_SERVER_CA":"http://usgs.esri.com:6080/arcgis/rest/services/USGS_HTMC_CA/ImageServer/",
	"MAP_SERVER_CA":"http://usgs.esri.com:6080/arcgis/rest/services/USGS_HTMC_Footprints_CA/MapServer",

	"INFO_THUMBNAIL_TOKEN":"?token=" + "04QDlTJ8GZUUva8naL0wGvh3VvkjKJj4zWvasskfpvSOmPVrEkYTYIxq9NfWVTQXcRHPRRsa__RWLSkrXutQ2l2Qsq5wp35iEnk8yvqEXT5kjmnpU4C-CC4HHnSDAUzaXTK8KG_NYRSSKTn-Hpca5NhfgvtOnj_-WblSTT7UAakJtVBs-z75mOOBEm_2TrMH",
	"IMAGE_SERVER":"http://historical1.arcgis.com/arcgis/rest/services/USA_Historical_Topo_Maps/ImageServer/",
	"MAP_SERVER":"http://historical1.arcgis.com/arcgis/rest/services/USA_Historical_Topo_Maps_Index/MapServer", // + "?self?culture=en&f=json&token=" + "IkxAypOD2nEVLGKrHr-SNYiFhlUs96IGpIaH2E1xXAB-JwIqiy--IotPbsr7nWVUoR3SzCiCtxCZTTZZfKvuEGEiX6idPZ_h4oc5-A71gJs9Z5yL_AVlUpmRtCn6BtmAYTb7cLTxerg0UEuhYwDtYk54RAE1AULhOjSY8ysOP-8MMRZIocFauQxB3eVUTHJS"

	/* Basemap initialization properties */
	"BASEMAP_STYLE": "topo",
	"BASEMAP_INIT_LAT":29.939833,
	"BASEMAP_INIT_LNG":-90.076046,
	"BASEMAP_INIT_ZOOM":12,

	/* Geocoder Dijit */
	"GEOCODER_PLACEHOLDER_TEXT": "Find a Place",

	"TOPO_INDEX":"http://services.arcgis.com/YkVYBaX0zm7bsV3k/ArcGIS/rest/services/USGSTopoIndex/FeatureServer/0",

	"OUTFIELDS":['*'],

	"MSG_UNKNOWN":"Unknown",

	"TIMELINE_STYLE":"box",
	"TIMELINE_HEIGHT":"300",
	"TIMELINE_ZOOM_MIN":201536000000,
	"TIMELINE_ZOOM_MAX":4153600000000,
	"TIMELINE_CLUSTER":false,
	"TIMELINE_SHOW_NAVIGATION":false,
	"TIMELINE_MIN_DATE":'1850',
	"TIMELINE_MAX_DATE":'2020',
	"TIMELINE_STEP":5,
	"TIMELINE_ANIMATE":true,

	"ZOOM_LEVEL_THRESHHOLD":9,
	"THUMBNAIL_VISIBLE_THRESHHOLD":12,

	// TMP
	"DOWNLOAD_PATH":"http://ims.er.usgs.gov/gda_services/download?item_id=",

	"IMAGE_FILL_OPACITY":0.0,
	"IMAGE_BORDER_OPACITY":1.0,
	"IMAGE_BORDER_WIDTH":2.0,

	"EXTENT_EXPAND":0.60,

	"SHARING_RELATED":"",
	"SHARING_HASHTAG":"USGS",

	"MAP_CLICK_HANDLER_ON":false
};