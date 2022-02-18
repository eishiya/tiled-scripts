/* 	Copy+Paste Layers by eishiya, last updated 17 Feb 2022

	Adds actions to the Edit menu that let you copy and paste entire layers,
	as opposed to only layer content.
	
	Copy Selected Layers: Copies the currently selected layers.
	Paste Layers: Pastes the layers, each one is added as a new layer.
	
	Possibly planned for the future:
	Paste Layers (Merge): Would paste the layers, but attempt to paste into
		existing layers (matching by name and group path) where possible.
*/
var CopyLayerHelpers = {};
CopyLayerHelpers.clipboard = null;
CopyLayerHelpers.copyLayers = function(curLayer, parentGroup, copyAll, merge) {
	if(!parentGroup || !(parentGroup.isTileMap || parentGroup.isGroupLayer) )
		return null;
	if(!curLayer || curLayer.isTileMap)
		return null;
	if(curLayer.selected || copyAll) {
		let newLayer = null;
		if(curLayer.isTileLayer) {
			newLayer = new TileLayer();
			newLayer.width = curLayer.width;
			newLayer.height = curLayer.height;
			//Copy all the tiles:
			let region = curLayer.region().boundingRect;
			if(region.width > 0 && region.height > 0) {
				let layerEdit = newLayer.edit();
				for(let x = region.x; x < region.x + region.width; ++x) {
					for(let y = region.y; y < region.y + region.height; ++y) {
						layerEdit.setTile(x, y, curLayer.tileAt(x, y), curLayer.flagsAt(x, y));
					}
				}
				layerEdit.apply();
			}
		} else if(curLayer.isObjectLayer) {
			newLayer = new ObjectGroup();
			newLayer.color = curLayer.color;
			newLayer.drawOrder = curLayer.drawOrder;
			//Copy all the objects:
			let objects = curLayer.objects;
			for(let oi = 0; oi < objects.length; ++oi) {
				let curObject = objects[oi];
				let newObject = new MapObject();
				newObject.font = curObject.font;
				newObject.width = curObject.width;
				newObject.height = curObject.height;
				newObject.name = curObject.name;
				newObject.polygon = curObject.polygon;
				newObject.x = curObject.x;
				newObject.y = curObject.y;
				newObject.rotation = curObject.rotation;
				newObject.shape = curObject.shape;
				newObject.text = curObject.text;
				newObject.textAlignment = curObject.textAlignment;
				newObject.textColor = curObject.textColor;
				newObject.tile = curObject.tile;
				newObject.tileFlippedHorizontally = curObject.tileFlippedHorizontally;
				newObject.tileFlippedVertically = curObject.tileFlippedVertically;
				newObject.type = curObject.type;
				newObject.visible = curObject.visible;
				newObject.wordWrap = curObject.wordWrap;
				
				newLayer.addObject(newObject);
			}
		} else if(curLayer.isImageLayer) {
			newLayer = new ImageLayer();
			newLayer.imageSource = curLayer.imageSource;
			newLayer.transparentColor = curLayer.transparentColor;
			newLayer.repeatX = curLayer.repeatX;
			newLayer.repeatY = curLayer.repeatY;
		} else if(curLayer.isGroupLayer) {
			newLayer = new GroupLayer();
			//selected group, may also have selected children
			let numLayers = curLayer.layerCount;
			for(let layerID = 0; layerID < numLayers; layerID++) {
				let child = CopyLayerHelpers.copyLayers(curLayer.layerAt(layerID), newLayer, copyAll, merge);
				if(child)
					newLayer.addLayer(child);
			}
		}
		
		//Copy properties:
		let properties = curLayer.properties();
		newLayer.setProperties(properties);
		
		newLayer.name = curLayer.name;
		newLayer.offset = curLayer.offset;
		newLayer.locked = curLayer.locked;
		newLayer.opacity = curLayer.opacity;
		newLayer.tintColor = curLayer.tintColor;
		newLayer.visible = curLayer.visible;
		return newLayer;	
	} else if(curLayer.isGroupLayer) {
		//Unselected group layer. May have selected children.
		let numLayers = curLayer.layerCount;
		for(let layerID = 0; layerID < numLayers; layerID++) {
			let child = CopyLayerHelpers.copyLayers(curLayer.layerAt(layerID), parentGroup, copyAll, merge);
			if(child)
				parentGroup.addLayer(child);
		}
	} else
		return null;
}

CopyLayerHelpers.copyLayersAction = tiled.registerAction("CopyLayers", function(action) {	
	//Check that the active asset is a tileset based on an image:
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap || map.selectedLayers.length < 1)
		return;
	
	//Make a new tilemap:
	let newMap = new TileMap();
	newMap.width = map.width;
	newMap.height = map.height;
	newMap.infinite = map.infinite;
	
	//Recursively iterate all the layers and add them to the map if they're selected:
	let numLayers = map.layerCount;
	for(let layerID = 0; layerID < numLayers; layerID++) {
		let newLayer = CopyLayerHelpers.copyLayers(map.layerAt(layerID), newMap, false, false);
		if(newLayer)
			newMap.addLayer(newLayer);
	}
	
	if(newMap && newMap.layerCount > 0)
		CopyLayerHelpers.clipboard = newMap;
	else CopyLayerHelpers.clipboard = null;

});
CopyLayerHelpers.copyLayersAction.text = "Copy Selected Layers";

CopyLayerHelpers.pasteLayersAction = tiled.registerAction("PasteLayers", function(action) {	
	if(!CopyLayerHelpers.clipboard || !CopyLayerHelpers.clipboard.isTileMap || CopyLayerHelpers.clipboard.layerCount < 1)
		return;
	
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap)
		return;
	
	//Recursively iterate all the copied layers and add them to the map:
	map.macro("Paste Layers", function() {
		let numLayers = CopyLayerHelpers.clipboard.layerCount;
		for(let layerID = 0; layerID < numLayers; layerID++) {
			let newLayer = CopyLayerHelpers.copyLayers(CopyLayerHelpers.clipboard.layerAt(layerID), map, true, false);
			if(newLayer)
				map.addLayer(newLayer);
		}
	});
});
CopyLayerHelpers.pasteLayersAction.text = "Paste Layers";

tiled.extendMenu("Edit", [
    { action: "CopyLayers", before: "SelectAll" },
    { action: "PasteLayers" },
	{separator: true}
]);
