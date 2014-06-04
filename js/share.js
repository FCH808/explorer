$(".share_facebook").click(shareFacebook);
$(".share_twitter").click(shareTwitter);
$(".share_bitly").click(requestBitly);

function shareFacebook()
{
	var options = '&p[title]=' + encodeURIComponent($('#title').text())
					+ '&p[summary]=' + encodeURIComponent($('#subtitle').text())
					+ '&p[url]=' + encodeURIComponent(document.location.href)
					+ '&p[images][0]=' + encodeURIComponent($("meta[property='og:image']").attr("content"));
	
	window.open(
		'http://www.facebook.com/sharer.php?s=100' + options, 
		'Facebook sharing', 
		'toolbar=0,status=0,width=626,height=436'
	);
}

function shareTwitter()
{
	console.log("twitter");
	var options = 'text=' + encodeURIComponent($('#title').text())
					+ '&url=' + encodeURIComponent(document.location.href)
					+ '&related=EsriStoryMaps'
					+ '&hashtags=storymap'; 

	window.open(
		'https://twitter.com/intent/tweet?' + options, 
		'Tweet', 
		'toolbar=0,status=0,width=626,height=436'
	);
}

function requestBitly()
{
	var bitlyUrls = [
		"http://api.bitly.com/v3/shorten?callback=?", 
		"https://api-ssl.bitly.com/v3/shorten?callback=?"
	];
	var bitlyUrl = location.protocol == 'http:' ? bitlyUrls[0] : bitlyUrls[1];
	
	var urlParams = esri.urlToObject(document.location.href).query || {};
	var targetUrl = document.location.href;
	
	$.getJSON(
		bitlyUrl, 
		{ 
			"format": "json",
			"apiKey": "R_14fc9f92e48f7c78c21db32bd01f7014",
			"login": "esristorymaps",
			"longUrl": targetUrl
		},
		function(response)
		{
			if( ! response || ! response || ! response.data.url )
				return;
			
			$("#bitlyLoad").fadeOut();
			$("#bitlyInput").fadeIn();
			$("#bitlyInput").val(response.data.url);
			$("#bitlyInput").select();
		}
	);
	$(".popover").show()
}