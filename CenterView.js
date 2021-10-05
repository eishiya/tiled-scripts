/*	Adds a "Center View on Map" action in the View menu, default hotkey Home.
	Puts the map in the centre of your screen, useful for returning to a map
	after scrolling away to other parts of a world.
	Does not change the current zoom.
*/

var action = tiled.registerAction("CenterView", function(action) {
	var map = tiled.activeAsset;
	if(!map || !map.isTileMap) return;
	if(map.infinite) {
		//tiled.mapEditor.currentMapView.centerOn(0, 0);
		function getBounds(mapLayer) {
			if(mapLayer.isTileLayer === true) {
				return mapLayer.region().boundingRect;
			} else if(mapLayer.isGroupLayer === true || mapLayer.isTileMap === true) {
				var bounds = null;
				for(var gl = 0; gl < mapLayer.layerCount; ++gl) {
					var childBounds = getBounds(mapLayer.layerAt(gl));
					if(childBounds) {
						if(!bounds)
							bounds = childBounds;
						else {
							if(childBounds.x < bounds.x)
								bounds.x = childBounds.x;
							if(childBounds.x + childBounds.width > bounds.x + bounds.width)
								bounds.width = childBounds.x + childBounds.width - bounds.x;
							if(childBounds.y < bounds.y)
								bounds.y = childBounds.y;
							if(childBounds.y + childBounds.height > bounds.y + bounds.height)
								bounds.height = childBounds.y + childBounds.height - bounds.y;
						}
					}
				}
				return bounds;
			}
			return null;
		}
		var mapBounds = getBounds(map);
		if(!mapBounds) {
			tiled.mapEditor.currentMapView.centerOn(0, 0);
		} else {
			tiled.mapEditor.currentMapView.centerOn((mapBounds.x + mapBounds.width/2) * map.tileWidth, (mapBounds.y + mapBounds.height/2)*map.tileHeight);
		}
	} else
		tiled.mapEditor.currentMapView.centerOn(map.width/2 * map.tileWidth, map.height/2*map.tileHeight);
});

action.text = "Center View on Map";
action.shortcut = "Home";
tiled.extendMenu("View", [
    { action: "CenterView", before: "FitInView" }
]);
