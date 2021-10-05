/* 	
	This script populates a map with tiles based on an input image.
	It will create a new layer called "Generated Ground".
	If the map is too small to fit the result, it will be resized.
	Any existing map content will not be touched.
	
	By default, this script attempts to make a map that has the same
	*pixel size* as the source image. If you have a map where each pixel
	corresponds to a tile, you'll need to set the map's imageScale
	property (see below) to a value that's 1/(tile size).
	
	========= Setting up your map =========
	The image to use should be set with a custom File property on the map called "mapImage".
	
	If your image is larger or smaller than your desired map, you can adjust the image scale
	by creating a custom float property on the map called "imageScale" and setting it to a positive number.
	For example, if your image is 1/4 the size of your map, set imageScale to 0.25
	
	The colour - tile mappings are defined as #rrggbb: tileId pairs in a custom map propety called "tileColors".
	This should be a multi-line string, with one pair per line.
	Any text that doesn't look like a color - tile pair will be ignored, so feel free to add comments. Example:
	
	#ffd300: 4 //sand
	#0078de: 3 //forest
	//town:
	00ff00: 2 //the # is optional
	#eeff23: 21
	
	The tileset will be determined at runtime. If only one tileset is present, it will be used. If multiple tilesets are present, the first tileset that either has "ground" in its name or has the custom property "ground" will be used. If no such tileset is found, the first tileset will be used.
	To make sure the correct tileset is used regardless of name and load order, add the custom property "ground" to it, a boolean set to true (checked). The "ground" property takes precedence over tileset names.
	
	=============== Caveats ===============
	If the image and map are large, the script may take a while to run. This is normal. Set it running and go make a snack.
	The generator does a reasonable job matching slightly-off colours to the provided colour - tile pairs and does not require exact matches, but the cleaner your source image is, the cleaner the results will be.
	The generator maps each colour to ONE type of tile and cannot handle context-sensitive colours. You can bucket-fill those after the script runs, use automapping, or adjust the source image to give each tile type its own colour.
	The script can't handle very small features, since it doesn't look at every pixel of the source image. If you want single-tile outlines (such as shallow water around coasts) or something like roads, it's best to leave those out of the source image and add them afterwards.
*/

var imageToMap = tiled.registerAction("MapFromImage", function(action) {
	var imageScale = 1.0; //How large is the image compared to the map?
	
	if(!tiled.activeAsset || !tiled.activeAsset.isTileMap) {
		tiled.alert("The active asset must be a TileMap to generate tiles in it.");
		return;
	}
	
	var map = tiled.activeAsset;
	
	//Get the main tileset:
	if(map.tilesets.length < 1) {
		tiled.alert("The active map has no tilesets. Make sure a tileset is associated with the map!");
		return;
	}
	var groundTileset = map.tilesets[0];
	for(var i = 1; i  < map.tilesets.length; ++i) { //look for first tileset with "ground" in its name or with the "ground" custom property:
		if(map.tilesets[i].property("ground")) {
			groundTileset = map.tilesets[i];
			break;
		}
		if(map.tilesets[i].name.toLowerCase().indexOf("ground") >= 0) {
			groundTileset = map.tilesets[i];
			//don't break if we just find a name match. There may still be a custom "ground" property to find!
		}
	}
	
	//Parse the color: tile mapping
	var tileColorsString = map.property("tileColors");
	if(!tileColorsString || tileColorsString.length < 1) {
		tiled.alert("No color - tile mappings set. Please make sure your map has a custom property \"tileColors\" with type string that lists your color - tile pairs as #rrggbb: tileId, one pair per line.");
		return;
	}
	tileColorsString = tileColorsString.toLowerCase();
	tileColorsString = tileColorsString.match(/^#?([0-9a-f]{6}):\s?([0-9]+)/gm);
	if(!tileColorsString && tileColorsString.length < 2) {
		tiled.alert("No valid color - tile mappings found in the tileColors property. Make sure it contains the color - tile pairs as #rrggbb: tileId, one per line.");
		return;
	}

	var tileColors = {};
	for(var i = 0; i < tileColorsString.length; ++i) {
		var parts = tileColorsString[i].match(/^#?([0-9a-f]{6}):\s?([0-9]+)/);
		tileColors[parseInt(parts[1], 16)] = groundTileset.tile(parseInt(parts[2]));
	}
	
	//This helper function scans through the list of map colours and finds the one most similar to a given colour:
	function findClosestColor(color) {
		var r, g, b;
		r = (color & 0x00ff0000) >> 16;
		g = (color & 0x0000ff00) >> 8;
		b = (color & 0x000000ff);
		
		function colorDifference(candidate) {
			var difference = 0;
			var difr, difg, difb;
			//red:
			difr = Math.abs( r - ((candidate & 0x00ff0000) >> 16) );
			//green:
			difg = Math.abs( g - ((candidate & 0x0000ff00) >> 8) );
			//blue:
			difb = Math.abs( b - (candidate & 0x000000ff) );

			difference = difr + difg + difb;
			
			return difference;
		}
		
		var colors = Object.keys(tileColors);
		var currentDifference = 100000; //definitely higher than the maximum, which is 255*3.
		var bestMatch = -1;
		for(var ci = 0; ci < colors.length; ++ci) {
			var newDifference = colorDifference(colors[ci]);
			if(newDifference < currentDifference) {
				currentDifference = newDifference;
				bestMatch = colors[ci];
			}
		}
		return bestMatch;
	}
	
	//Get the colour of a given "tile" in the image. Samples a few pixels and returns their mean colour.
	function getMapColor(x, y) {
		return mapImage.pixel(x, y); //turns out the simplest option is best :]
	}
	
	var imageName = map.property("mapImage");
	if(!imageName || !imageName.url || imageName.url.length < 1) {
		tiled.alert("No valid mapImage is set. Make sure the property exists and is of type File.");
		return;
	}
	//override the default image scale:
	var imageScaleProperty = map.property("imageScale");
	if(imageScaleProperty && imageScaleProperty > 0)
		imageScale = imageScaleProperty;
	
	var mapImage = new Image(imageName);
	if(mapImage.width < map.tileWidth*imageScale || mapImage.height < map.tileHeight*imageScale) {
		tiled.alert("The map image is too small ("+mapImage.width+" x "+mapImage.height+")! At the current scale ("+imageScale+"), it would not fill even a single tile.");
		return;
	}
	
	//Figure out how large the map should be to accommodate this image:
	var mapWidth = 1, mapHeight = 1;
	
	switch(map.orientation) {
		case TileMap.Isometric:
			//We're not going to reproject the image, so in this mode, the image's corners will not be incorporated into the map.
			mapWidth = mapImage.width / (map.tileWidth*imageScale);
			mapHeight = mapImage.height / (map.tileHeight*imageScale);
			break;
		case TileMap.Staggered:
			if(map.staggerAxis == TileMap.StaggerX) {
				mapWidth = mapImage.width / (map.tileWidth/2*imageScale);
				mapHeight = mapImage.height / (map.tileHeight*imageScale);
			} else {
				mapWidth = mapImage.width / (map.tileWidth*imageScale);
				mapHeight = mapImage.height / (map.tileHeight/2*imageScale);
			}
			break;
		case TileMap.Hexagonal:
			if(map.staggerAxis == TileMap.StaggerX) {
				mapWidth = mapImage.width / ((map.tileWidth - (map.tileWidth - map.hexSideLength)/2)*imageScale);
				mapHeight = mapImage.height / (map.tileHeight*imageScale);
			} else {
				mapWidth = mapImage.width / (map.tileWidth*imageScale);
				mapHeight = mapImage.height / ((map.tileHeight - (map.tileHeight - map.hexSideLength)/2)*imageScale);
			}
			break;
		default: //Orthographic or Unknown (in which case, it's treated as orthographic)
			mapWidth = mapImage.width / (map.tileWidth*imageScale);
			mapHeight = mapImage.height / (map.tileHeight*imageScale);

	}
	mapWidth = Math.floor(mapWidth);
	mapHeight = Math.floor(mapHeight);
	if(mapWidth * mapHeight < 1) { //at least one of the dimensions is invalid!
		tiled.alert("The map image is too small, and cannot be used to create a map with the current tile type and size. Use a larger image, smaller tiles, or a smaller image scale.");
		return;
	}

	map.macro("Populate Map from Image", function() {
		//Make sure the map is at least large enough to fit the new content:
		if(!map.infinite) {
			if(mapWidth > map.width)
				map.resize(Qt.size(mapWidth, map.height));
			if(mapHeight > map.height)
				map.resize(Qt.size(map.width, mapHeight));
		}
		var newLayer = new TileLayer("Generated Ground");
		//For each cell in the map, sample an appropriate pixel in the image, and find the closest matching tile:
		var newLayerEdit = newLayer.edit();
		for(var x = 0; x < mapWidth; ++x) {
			for(var y = 0; y < mapHeight; ++y) {
				//get the coordinate of the centre of this tile:
				var tileLocation = map.tileToPixel(x, y);
				tileLocation.x = (tileLocation.x + map.tileWidth*0.5) * imageScale;
				tileLocation.y = (tileLocation.y + map.tileHeight*0.5) * imageScale;
				var imageColor = getMapColor(tileLocation.x, tileLocation.y); //mapImage.pixel(tileLocation.x, tileLocation.y);
				imageColor = findClosestColor(imageColor);
				newLayerEdit.setTile(x, y, tileColors[imageColor]);
			}
		}
		newLayerEdit.apply();
		map.addLayer(newLayer);
	});	
});
imageToMap.text = "Populate Map from Image";

tiled.extendMenu("Map", [
    { action: "MapFromImage", before: "MapProperties" },
	{separator: true}
]);
