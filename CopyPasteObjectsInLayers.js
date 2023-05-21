/* 	Copy+Paste Objects in Layers by eishiya, last updated 21 May 2023

	Adds actions to the Edit menu that let you copy and paste objects from and
	to multiple layers, similarly to copy+pasting tiles from/to multiple layers.
	
	Copy Objects in Layers: Copies the currently selected Objects and remembers
		their source layers' names.
	Paste Objects in Layers: Pastes the Objects into Layers that have the same
		names as the source layers. If such layers don't exist, they're created.
	
	The clipboard used by this script is independent of the usual clipboard
	used for copy+pasting, and anything copied will be lost when scripts are
	reloaded or when Tiled is restarted.
*/
var CopyObjectsInLayers = {};
CopyObjectsInLayers.clipboard = null;

CopyObjectsInLayers.copyObjectLayer = function(curLayer, dstLayer) {
	let newLayer = null;
	let copyAll = false;
	let newObjects = [];
	if(curLayer && curLayer.isObjectLayer) {
		if(dstLayer && dstLayer.isObjectLayer) {
			newLayer = dstLayer;
			copyAll = true;
		} else {
			newLayer = new ObjectGroup();
			newLayer.name = curLayer.name;
		}
		//Copy all the selected objects:
		let objects = curLayer.objects;
		for(let oi = 0; oi < objects.length; ++oi) {
			let curObject = objects[oi];
			if(!curObject.selected && !copyAll) continue;
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
			if(copyAll) newObjects.push(newObject);
		}
	}
	if(copyAll) return newObjects;
	else return newLayer;
}

// Recursively iterates over all the Object layers in a map to find a layer with
// a particular name, optionally skipping over the first skipLayers matches.
CopyObjectsInLayers.findObjectLayerByName = function(map, layerName, skipLayers = 0) {
	function find(layer) {
		if(layer.isTileMap || layer.isGroupLayer) {
			let numLayers = layer.layerCount;
			let found = null;
			for(let layerID = 0; layerID < numLayers; layerID++) {
				let found = find(layer.layerAt(layerID));
				if(found)
					return found;
			}
			return null;
		} else if(layer.isObjectLayer) {
			if(layer.name == layerName) {
				if(skipLayers <= 0)
					return layer;
				else
					skipLayers--;
			}
			return null;
		}
	}
	return find(map);
}

CopyObjectsInLayers.copy = tiled.registerAction("CopyObjectsInLayers", function(action) {	
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap || map.selectedObjects.length < 1)
		return;
	
	//Make a new tilemap:
	let newMap = new TileMap();
	newMap.width = map.width;
	newMap.height = map.height;
	
	//Compile a list of Object layers containing selected objects:
	let layers = [];
	let objects = map.selectedObjects;
	let numObjects = map.selectedObjects.length;
	for(let i = 0; i < numObjects; i++) {
		let obj = objects[i];
		if(obj.layer && !layers.includes(obj.layer))
			layers.push(obj.layer);
	}
	
	//Recursively iterate all the layers and add them to the map if they're selected:
	let numLayers = layers.length;
	for(let layerID = 0; layerID < numLayers; layerID++) {
		let newLayer = CopyObjectsInLayers.copyObjectLayer(layers[layerID]);
		if(newLayer)
			newMap.addLayer(newLayer);
	}
	
	if(newMap && newMap.layerCount > 0)
		CopyObjectsInLayers.clipboard = newMap;
	else CopyObjectsInLayers.clipboard = null;
	
	CopyObjectsInLayers.updateEnabledState();
});
CopyObjectsInLayers.copy.text = "Copy Objects in Layers";

CopyObjectsInLayers.paste = tiled.registerAction("PasteObjectsInLayers", function(action) {
	if(!CopyObjectsInLayers.clipboard || !CopyObjectsInLayers.clipboard.isTileMap || CopyObjectsInLayers.clipboard.layerCount < 1)
		return;
	
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap)
		return;
	
	map.macro("Paste Objects in Layers", function() {
		let numLayers = CopyObjectsInLayers.clipboard.layerCount;
		let layerNameCounts = {};
		let newObjects = [];
		for(let layerID = 0; layerID < numLayers; layerID++) {
			let srcLayer = CopyObjectsInLayers.clipboard.layerAt(layerID);
			if(layerNameCounts[srcLayer.name] === undefined) layerNameCounts[srcLayer.name] = 0;
			let dstLayer = CopyObjectsInLayers.findObjectLayerByName(map, srcLayer.name, layerNameCounts[srcLayer.name]);
			if(!dstLayer) {
				dstLayer = new ObjectGroup(srcLayer.name);
				map.addLayer(dstLayer);
			}
			let copiedObjects = CopyObjectsInLayers.copyObjectLayer(srcLayer, dstLayer);
			for(obj of copiedObjects)
				newObjects.push(obj);
			layerNameCounts[srcLayer.name]++;
		}
		map.selectedObjects = newObjects;
	});
});
CopyObjectsInLayers.paste.text = "Paste Objects in Layers";

//Enable/disable the actions as needed:
CopyObjectsInLayers.copy.enabled = false;
CopyObjectsInLayers.paste.enabled = false;

CopyObjectsInLayers.updateEnabledState = function() {
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap) {
		CopyObjectsInLayers.copy.enabled = false;
		CopyObjectsInLayers.paste.enabled = false;
		return;
	}
	
	if(CopyObjectsInLayers.clipboard)
		CopyObjectsInLayers.paste.enabled = true;
	else
		CopyObjectsInLayers.paste.enabled = false;
	
	if(map.selectedObjects.length > 0)
		CopyObjectsInLayers.copy.enabled = true;
	else
		CopyObjectsInLayers.copy.enabled = false;
}

CopyObjectsInLayers.currentMap = null;
tiled.activeAssetChanged.connect(function(asset) {
	if(CopyObjectsInLayers.currentMap != asset) {
		if(!asset || !asset.isTileMap) {
			CopyObjectsInLayers.copy.enabled = false;
			CopyObjectsInLayers.paste.enabled = false;
			CopyObjectsInLayers.currentMap = null;
		} else { //asset exists and is a TileMap
			if(CopyObjectsInLayers.currentMap)
				CopyObjectsInLayers.currentMap.selectedObjectsChanged.disconnect(CopyObjectsInLayers.updateEnabledState);
			CopyObjectsInLayers.currentMap = asset;
			asset.selectedObjectsChanged.connect(CopyObjectsInLayers.updateEnabledState);
			CopyObjectsInLayers.updateEnabledState();
		}
	}
});
CopyObjectsInLayers.updateEnabledState();
if(tiled.activeAsset && tiled.activeAsset.isTileMap) {
	CopyObjectsInLayers.currentMap = tiled.activeAsset;
	CopyObjectsInLayers.currentMap.selectedObjectsChanged.connect(CopyObjectsInLayers.updateEnabledState);
}

//Add the actions to the Edit menu:
tiled.extendMenu("Edit", [
	{ action: "CopyObjectsInLayers", before: "SelectAll" },
	{ action: "PasteObjectsInLayers" },
	{ separator: true }
]);
//And to the objects right click menu:
/*tiled.extendMenu("MapView.Objects", [
	{ action: "CopyObjectsInLayers" }, //this menu doesn't seem to have action names we can use for "before"
	{ action: "PasteObjectsInLayers" },
	{ separator: true }
]);*/
