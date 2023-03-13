/* 	Tileset Heatmap script by eishiya, last updated 13 Mar 2023

	Adds an action to the Tileset menu that generates a heatmap of the tileset,
	showing how many times each tile is used, allowing you to find tiles that
	are underutilised, or details you may be overusing.
	Currently, the script only counts tiled in currently open maps.
	
	Requires Tiled 1.9 or newer.
	
	TODO: When the Project API is added, scan all maps in the project.
*/
var tilesetHeatmap = tiled.registerAction("TilesetHeatmap", function(action) {
	let tileset = tiled.activeAsset;
	if(!tileset || !tileset.isTileset)
		return;
	
	let tileCounts = {};
	let maps = [];
	//Populate maps:
	//TODO: Populate from project, if loaded.
	for(asset of tiled.openAssets) {
		if(asset.isTileMap && asset.property("ExcludeFromHeatmaps") != true)
			maps.push(asset);
	}
	
	let maxCount = 0;
	
	//Count every occurrence:
	function countTiles(layer) {
		if(layer.isTileLayer) {
			let region = layer.region();
			for(rect of region.rects) {
				for(let x = rect.x; x < rect.x + rect.width; x++) {
					for(let y = rect.y; y < rect.y + rect.height; y++) {
						let tile = layer.tileAt(x, y);
						if(tile && tile.tileset == tileset) {
							if(tileCounts[tile.id])
								tileCounts[tile.id]++;
							else
								tileCounts[tile.id] = 1;
							
							if(tileCounts[tile.id] > maxCount)
								maxCount = tileCounts[tile.id];
						}
					}
				}
			}
		} else if(layer.isObjectLayer) {
			for(object of layer.objects) {
				let tile = object.tile;
				if(tile && tile.tileset == tileset) {
					if(tileCounts[tile.id])
						tileCounts[tile.id]++;
					else
						tileCounts[tile.id] = 1;
					
					if(tileCounts[tile.id] > maxCount)
						maxCount = tileCounts[tile.id];
				}
			}
		} else if(layer.isTileMap || layer.isGroupLayer) {
			for(let gi = 0; gi < layer.layerCount; ++gi) {
				countTiles(layer.layerAt(gi));
			}
		}
	}
	
	for(map of maps) {
		countTiles(map);
	}

	if(maxCount < 1) {
		tiled.warn("Could not find any tiles from this tileset. There is no heatmap to display.");
	}
	
	//We've now counted every occurrence of every relevant tile in every layer of every map.
	//Prepare our canvas:
	let width = tileset.columnCount;
	let height = Math.ceil(tileset.tileCount / width);
	
	let heatmap = new TileMap();
	heatmap.orientation = TileMap.Orthogonal; //tilesets are always orthogonal
	heatmap.width = width;
	heatmap.height = height;
	heatmap.tileWidth = tileset.tileWidth;
	heatmap.tileHeight = tileset.tileHeight;
	heatmap.backgroundColor = tileset.backgroundColor;
	heatmap.setProperty("ExcludeFromHeatmaps", true);
	
	let tileLayer = new TileLayer(tileset.name);
	heatmap.addLayer(tileLayer)
	let heatLayer = new TileLayer("Heatmap");
	heatLayer.opacity = 0.75;
	heatmap.addLayer(heatLayer);
	
	if(true || !tilesetHeatmap.gradientTileset) //Reusing the same tileset doesn't work because of garbage collection, so we always create a new one.
		tilesetHeatmap.generateTileset();
	if(!tilesetHeatmap.gradientTileset) {
		tiled.error("Could not display heatmap: could not create gradient tileset.");
		return;
	}
	
	//Paint the tiles and their heat:
	let tileEdit = tileLayer.edit();
	let heatEdit = heatLayer.edit();
	
	let tiles = tileset.tiles;
	let heatTiles = tilesetHeatmap.gradientTileset.tiles;
	for(let i = 0; i < tiles.length; i++) {
		let x = i % width;
		let y = Math.floor(i / width);
		let tile = tiles[i];
		if(!tile) break; //If tiles ever contains null, something's gone wrong in the scripting system.
		tileEdit.setTile(x, y, tile);
		let heat = tileCounts[tile.id];
		if(heat > 0) heat = Math.ceil( heat/maxCount * (heatTiles.length-1) );
		else heat = 0;
		heatEdit.setTile(x, y, heatTiles[heat]);
	}
	tileEdit.apply();
	heatEdit.apply();
	
	tiled.activeAsset = heatmap;
	tiled.log("Tileset Heatmap for "+tileset.name+": the highest tile count was "+maxCount);
});
tilesetHeatmap.text = "Tileset Heatmap";
tilesetHeatmap.filename = __filename;
tilesetHeatmap.gradientTileset = null;
tilesetHeatmap.generateTileset = function() {
	let zeroColor = 0xe30066; //Special colour for the pixel representing 0
	let gradientPoints = [
		{color: 0xffd2ff, start: 0},
		{color: 0xdb9653, start: 0.02},
		{color: 0x676f3e, start: 0.25},
		{color: 0x24424a, start: 0.50},
		{color: 0x040609, start: 1}
	];
	if(gradientPoints.length < 1) {
		tiled.error("Could not generate heatmap gradient: No colours in gradient.");
		tilesetHeatmap.gradientTileset = null;
		return;
	}
	//transform the gradient data into RGB points for easier use:
	for(point of gradientPoints) {
		let color = point.color;
		let rgb = {};
		rgb.r = (color & 0xFF0000) >> 16;
		rgb.g = (color & 0x00FF00) >> 8;
		rgb.b = (color & 0x0000FF) >> 0;
		point.color = rgb;
	}
	
	let gradientWidth = 255; //Actual gradient will be 1px wider, to fit the special zero colour. This must be a positive integer.
	let gradient = new Image(gradientWidth+1, 1, Image.Format_RGB888);
	
	gradient.setPixel(0, 0, zeroColor);
	for(let x = 1; x <= gradientWidth; x++) {
		let colorPos = x / gradientWidth;
		let start, end;
		for(let i = gradientPoints.length - 1; i >= 0; i--) {
			let point = gradientPoints[i];
			if(point.start < colorPos) {
				start = i;
				break;
			}
		}
		if(start >= gradientPoints.length)
			start = gradientPoints.length-1;
		if(start < gradientPoints.length - 1)
			end = start+1;
		else
			end = start;
		
		if(start == end)
			colorPos = 1;
		else //Normalise the position:
			colorPos = (colorPos - gradientPoints[start].start) / (gradientPoints[end].start - gradientPoints[start].start);
		//lerp between start and end colours:
		let color = {};		
		color.r = Math.round( (1-colorPos) * gradientPoints[start].color.r + (colorPos) * gradientPoints[end].color.r );
		color.g = Math.round( (1-colorPos) * gradientPoints[start].color.g + (colorPos) * gradientPoints[end].color.g );
		color.b = Math.round( (1-colorPos) * gradientPoints[start].color.b + (colorPos) * gradientPoints[end].color.b );
		//Convert the colour to 0xRRGGBB and colour the pixel:
		color = (color.r << 16) + (color.g << 8) + color.b;
		gradient.setPixel(x, 0, color);
	}
	
	let gradientTileset = new Tileset("Heatmap Gradient");
	gradientTileset.tileWidth = 1;
	gradientTileset.tileHeight = 1;
	gradientTileset.tileRenderSize = Tileset.GridSize;
	gradientTileset.fillMode = Tileset.Stretch;
	gradientTileset.loadFromImage(gradient);
	tilesetHeatmap.gradientTileset = gradientTileset;
};

tiled.extendMenu("Tileset", [
    { action: "TilesetHeatmap", before: "TilesetProperties" },
	{separator: true}
]);
