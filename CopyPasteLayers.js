/* 	Copy+Paste Layers by eishiya, last updated 13 Mar 2022

	Adds actions to the Edit menu that let you copy and paste entire layers,
	as opposed to only layer content.
	
	Copy Selected Layers: Copies the currently selected layers.
	Paste Layers: Pastes the layers, each one is added as a new layer.
			The layers are pasted above the top-most selected layer,
			or at the top of the layer stack if no layers are selected.
	
	The clipboard used by this script is independent of the usual clipboard
	used for copy+pasting, and anything copied will be lost when scripts are
	reloaded or when Tiled is restarted.
	
	Unselected layers within groups are also copied by default. You can change
	this behaviour to strictly copy only those layers that are directly selected
	by changing `CopyLayerHelpers.ignoreUnselectedChildren` to true below.
	
	If you select some child layers but not the parent Group, the child layers
	will be added to the first available parent (such as the root map),
	and the unselected Group will not be copied.
	
	CAUTION: If you're using a version of Tiled older than 1.8.2, make sure you
	add all the tilesets used by the pasted layers to the destination map!
	Older versions of Tiled don't automatically add the tilesets to the map,
	so if you save the map without the tilesets being there, the tiles will be
	empty when you load the map.
	
	Possibly planned for the future:
	Paste Layers (Merge): Would paste the layers, but attempt to paste into
		existing layers (matching by name and group path) where possible.
*/
var CopyLayerHelpers = {};
CopyLayerHelpers.clipboard = null;
//Set this to true to NOT copy the unselected children of selected groups:
CopyLayerHelpers.ignoreUnselectedChildren = false;

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
				if(curObject.tile) {
					newObject.tile = curObject.tile;
					newObject.tileFlippedHorizontally = curObject.tileFlippedHorizontally;
					newObject.tileFlippedVertically = curObject.tileFlippedVertically;
				}
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
				let child = null;
				if(CopyLayerHelpers.ignoreUnselectedChildren)
					child = CopyLayerHelpers.copyLayers(curLayer.layerAt(layerID), newLayer, copyAll, merge);
				else
					child = CopyLayerHelpers.copyLayers(curLayer.layerAt(layerID), newLayer, true, merge);
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
	
	let targetLayer = map;
	let targetIndex = -1;
	
	//recursive helper function to find the topmost selected layer:
	function findTopmostLayer(parentLayer) {
		let numLayers = parentLayer.layerCount;
		for(let layerID = numLayers-1; layerID >= 0; layerID--) {
			let candidate = parentLayer.layerAt(layerID);
			if(candidate.selected) {
				targetLayer = parentLayer;
				targetIndex = layerID;
				return candidate;
			}
			if(candidate.isGroupLayer) {
				candidate = findTopmostLayer(candidate);
				if(candidate)
					return candidate;
			}
		}
		return null;
	}
	
	if(findTopmostLayer(map) === null) {
		targetLayer = map;
		targetIndex = map.layerCount-1;
	} //else, the values are already set
	
	//Recursively iterate all the copied layers and add them to the map:
	map.macro("Paste Layers", function() {
		let numLayers = CopyLayerHelpers.clipboard.layerCount;
		for(let layerID = 0; layerID < numLayers; layerID++) {
			let newLayer = CopyLayerHelpers.copyLayers(CopyLayerHelpers.clipboard.layerAt(layerID), map, true, false);
			if(newLayer) {
				//map.addLayer(newLayer); //add the layer at the top
				targetLayer.insertLayerAt(targetIndex+1, newLayer); //add the layer above the found layer
				targetIndex++; //increase the index for the next insertion
			}
		}
	});
});
CopyLayerHelpers.pasteLayersAction.text = "Paste Layers";

tiled.extendMenu("Edit", [
    { action: "CopyLayers", before: "SelectAll" },
    { action: "PasteLayers" },
	{separator: true}
]);
