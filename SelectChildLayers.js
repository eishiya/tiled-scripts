/* 	Select Child Layers by eishiya, last updated 2 May 2023

	Adds an action to the Layer menu and the Layers view right-click menu
	that recursively selects all the child layers of any currently selected
	Group Layers.
*/

var selectChildLayers = tiled.registerAction("SelectChildLayers", function(action) {	
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap)
		return;
	
	function selectChildren(group) {
		group.selected = true;
		if(group.isGroupLayer) {
			let numChildren = group.layerCount;
			for(let childID = 0; childID < numChildren; childID++) {
				let child = group.layerAt(childID);
				selectChildren(child);
			}
		}
	}
	
	let selectedLayers = map.selectedLayers;
	
	//Recursively iterate all the selected layers and also select their children:
	map.macro("Paste Layers", function() {
		let numLayers = selectedLayers.length;
		for(let layerID = 0; layerID < numLayers; layerID++) {
			let selectedLayer = selectedLayers[layerID];
			if(selectedLayer && selectedLayer.selected && selectedLayer.isGroupLayer) {
				selectChildren(selectedLayer);
			}
		}
	});

});
selectChildLayers.text = "Select Child Layers";

tiled.extendMenu("Layer", [
    { action: "SelectChildLayers", before: "MoveLayersUp" }
]);
tiled.extendMenu("LayerView.Layers", [
    { action: "SelectChildLayers", before: "MoveLayersUp" }
]);
