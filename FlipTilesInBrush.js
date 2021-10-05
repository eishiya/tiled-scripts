/*	Adds actions to the Edit menu to flip tiles in the current brush
	horizontally or vertically, while keeping their position.\
	
	Useful mainly in combination with Tiled's built-in brush flipping to flip
	large arrangements of tiles without flipping each tile in them, but it's
	useful for automapping and such too.
*/

var flipBrushHorizontally = tiled.registerAction("FlipTilesHorizontally", function(action) {
	var brush = tiled.mapEditor.currentBrush;
	
	if(brush && brush.size && brush.size.width > 0 && brush.size.height > 0) {
		var numLayers = brush.layerCount;
		for(var layerID = 0; layerID < numLayers; layerID++) {
			var curLayer = brush.layerAt(layerID);
			var curEdit = curLayer.edit();
			
			if(curLayer.isTileLayer && curLayer.visible) {
				for(var x = 0; x < curLayer.size.width; x++) {
					for(var y = 0; y < curLayer.size.height; y++) {
						var cell = curLayer.cellAt(x, y);
						if(cell && cell.tileId > -1) {
							curEdit.setTile(x, y, curLayer.tileAt(x, y), curLayer.flagsAt(x, y) ^ Tile.FlippedHorizontally);
						}
					}
				}
				curEdit.apply();
			}
		}
	}
	
	tiled.mapEditor.currentBrush = brush;
	
});

flipBrushHorizontally.text = "Flip Brush Tiles Horizontally";

var flipBrushVertically = tiled.registerAction("FlipTilesVertically", function(action) {
	var brush = tiled.mapEditor.currentBrush;
	
	if(brush && brush.size && brush.size.width > 0 && brush.size.height > 0) {	
		var numLayers = brush.layerCount;
		for(var layerID = 0; layerID < numLayers; layerID++) {
			var curLayer = brush.layerAt(layerID);
			var curEdit = curLayer.edit();

			if(curLayer.isTileLayer && curLayer.visible) {
				for(var x = 0; x < curLayer.size.width; x++) {
					for(var y = 0; y < curLayer.size.height; y++) {
						var cell = curLayer.cellAt(x, y);
						if(cell && cell.tileId > -1) {
							curEdit.setTile(x, y, curLayer.tileAt(x, y), curLayer.flagsAt(x, y) ^ Tile.FlippedVertically);
						}
					}
				}
				curEdit.apply();
			}
		}
	}
	
	tiled.mapEditor.currentBrush = brush;
	
});

flipBrushVertically.text = "Flip Brush Tiles Vertically";

tiled.extendMenu("Edit", [
    { action: "FlipTilesHorizontally", before: "Preferences" },
	{ action: "FlipTilesVertically" },
	{ separator: true }
]);
