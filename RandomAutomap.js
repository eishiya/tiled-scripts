/* 	Random Automap script by eishiya, last updated 20 Nov 2023

	Applies Automapping to the current map similarly to Map > AutoMap,
	but adds some new directives that allow randomisation and conditionals:
	
	- Random: [Name]
		Chooses a random rules file from a group. A group starts on the line
		below "Random:" and continues to the next empty line.
		The chosen map will be saved in a variable called Name, if provided.
	- If Name == Value
		Checks whether the variable called Name has the value "Value",
		and if it is, subsequent rules files will be allowed to run.
	- If Name != Value
		As above, but checks that the variable is NOT equal to "Value".
	- Chance #: [Name]
		Roll a random number [0.0, 1.0), and if it's less than the specified
		number #, any subsequent rules files will be allowed to run. If Name
		is provided, "true" or "false" will be stored in a variable called
		Name, depending on whether the check passed.
	
	These directives must appear as comments, i.e. prefixed with // or #
	This means rules.txt files designed for this script are also valid for
	regular Automapping, albeit they will behave differently as Tiled will run
	all of the rules files.
	The directives are not case-sensitive, and you can put spaces around them.
	
	All If conditions are cumulative, but reset at each empty line.
	
	Any Chance conditions are *not* cumulative, each new Chance is independent
	of the previous ones. Chance conditions reset on empty lines.
	
	As in normal automapping, map name filters (e.g. [dungeon*.tmx]) never reset
	automatically and don't usually affect rules lists (.txt files). However,
	map name filters do affect the options for Random, and that includes options
	that are rules lists.
	You can reset the filter by using [*] as your map name filter.
	
	As with regular Automapping, anything that is not a comment or an empty line
	will be treated as a rules file, i.e. a rules map or another rules list.
	A rules list inside a Random group will be treated as just another option.
	Any referenced rules lists will run as normal Automapping, they will not be
	parsed by this script.
	
	Variable names can only include alphanumeric ASCII characters and the
	underscrore character _, spaces and any other characters are not allowed.
	
	The variable values are stored as the strings and are not resolved in any
	way. This means "./rules.tmx" and "rules.tmx" are considered to be different
	things, even though they point to the same file.
	
	This script can be used to handle all of your conditional rules, simplifying
	your actual Automapping rules but requiring a complex rules.txt, or you can
	use it just to seed a guide layer for the whole map with some tiles, and
	Automap as normal from there, using those guide tiles in your rules.
	
	The directives offer only very basic logic, this is by design to keep the
	markup simple - it is not meant to replace the full power over Automapping
	that writing a dedicated Tiled script provides.
	
	===== Examples: ============================================================
	//--------------------------------
	//Random:
	rulesA.tmx
	rulesB.tmx
	//irrelevant comment
	rulesC.tmx
	
	rulesD.tmx
	rulesE.tmx
	//--------------------------------
	In the above example, one of A, B, or C will run, and both D and E will run.
	This kind of set up is all you need if you just want a randomly chosen
	guide layer for subsequent rules.
	
	The If directive allows you to run subsequent rules based on earlier random
	decisions:
	//--------------------------------
	//Random: Wall
	brick.tmx
	stone.tmx
	
	//If Wall == brick.tmx
	brickDetails.tmx
	
	//If Wall == stone.tmx
	//Random:
	stoneDetailsA.tmx
	stoneDetailsB.tmx
	//--------------------------------
	In the above example, one of brick.tmx or stone.tmx will run. Then, if
	brick.tmx was chosen, brickDetails.tmx will run. If stone.tmx was chosen,
	then one of stoneDetailsA.tmx or stoneDetailsB.tmx will run instead.
	
	In the following example, poshHouse.tmx will only run if brick.tmx
	was chosen for Wall AND fancyWindows.tmx was chosen for Window,
	but it will only run 50% of the time, and all of this will only take effect
	on maps whose filenames start with "interior":
	//--------------------------------
	[interior*]
	//If Wall == brick.tmx
	//If Window == fancyWindows.tmx
	//Chance 0.5:
	poshHouse.tmx
	//--------------------------------
	
	You can also use If and Chance inside of a Random group, allowing options
	to be added conditionally:
	//--------------------------------
	//Random:
	genericBase.tmx
	//Chance 0.35:
	fancyBase.tmx
	//Chance 1.0:
	//If Wall == brick.tmx
	brickBase.tmx
	//Chance 0.1:
	brickFancyBase.tmx
	
	//--------------------------------
	In this case, genericBase.tmx will always be an option, fancyBase.tmx will
	be an option 35% of the time. Then, if brick.tmx was chosen for Wall,
	brickBase.tmx will be added as an option and brickFancyBase.tmx
	will be an option 10% of the time.
	
	Chance will generate a value even if no rules follow it, so you can store
	its result and use it to modify multiple later sets of rules:
	//--------------------------------
	//Chance 0.5: Fancy
	
	//Random:
	doorsA.tmx
	doorsB.tmx
	//If Fancy == true
	fancyDoorsA.tmx
	fancyDoorsB.tmx
	
	//Random:
	windows.tmx
	//If Fancy == true
	fancyWindows.tmx
	//--------------------------------
	
	
	The following example is BAD and demonstrates an easy mistake to make:
	//-------------- BAD EXAMPLE ------------------
	//Random:
	genericBase.tmx
	//If Wall == brick.tmx
	brickBase.tmx
	//If Wall == stone.tmx
	stoneBase.tmx
	//-------------- BAD EXAMPLE ------------------
	This is intended to conditionally add brickBase.tmx or stoneBase.tmx
	as options based on a previous selection, but it will not work that way.
	Within a single group, If conditions are cumulative (logical AND).
	This means that if Wall is "stone.tmx", the first check will fail, and
	the second check will be ANDed with it, so stoneBase.tmx will never be
	added as an option.
	For this example to work as expected, it would need to be split into two
	groups, each of which checks Wall once:
	//-------------- FIXED EXAMPLE ------------------
	//If Wall == brick.tmx
	//Random:
	genericBase.tmx
	brickBase.tmx
	
	//If Wall == stone.tmx
	//Random:
	genericBase.tmx
	stoneBase.tmx
	//-------------- FIXED EXAMPLE ------------------
	
	This action does not work via CLI, as it requires TileMap.autoMap().
	Requires Tiled 1.10.1+ to use the Automapping file specified in the Project,
	but should work in Tiled 1.3+ for rules.txt in the working map's directory.
*/

var randomAutomapAction = tiled.registerAction("RandomAutomap", function(action) {
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap) return;
	
	let rulesFound = false;
	let rulesPath = map.fileName;
	if(rulesPath) {
		rulesPath = FileInfo.path(rulesPath) + "/rules.txt";
		if( File.exists(rulesPath) )
			rulesFound = true;
	}
	if(!rulesFound && tiled.project) {
		rulesPath = tiled.project.automappingRulesFile;
		if( rulesPath && File.exists(rulesPath) )
			rulesFound = true;
	}
	
	if(!rulesFound) {
		tiled.log('No automapping rules file "'+rulesPath+'" found.'+(tiled.project? '' : ' Note: Your version of Tiled does not support using the automapping rules set in the Project.') );
		return;
	}

	//Get the file contents:
	let rulesFile = new TextFile(rulesPath, TextFile.ReadOnly);
	let lines = rulesFile.readAll();
	rulesFile.close();
	lines.replace(/\r\n/g, '\n'); //Fix Windows-style newlines
	lines = lines.split('\n');
	let basePath = FileInfo.path(rulesPath) + "/";
	
	let randomising = false;
	let randomOptions = [];
	let randomChoices = {}, lastRandomName = null; //For saving the choices.
	let matchesFilter = true;
	let matchesCondition = true; //Stores whether the accumulated conditions are all true.
	let matchesChance = true; //Stores whether the last chance roll passed.
	
	function applyRandom() {
		randomising = false;
		if(randomOptions.length > 0) { //We don't check the condition here because it was checked while adding options
			let choice = randomOptions[ Math.floor(Math.random()*randomOptions.length) ];
			if(lastRandomName) { //Save this choice in case we want to refer to it later.
				randomChoices[lastRandomName] = choice;
				lastRandomName = null;
			}
			map.autoMap(basePath + choice);
		}
		randomOptions.length = 0;
	}
	
	map.macro("Random Automap", function() {
		for(line of lines) {
			if(line == "") {
				if(randomising)
					applyRandom();
				matchesCondition = true; //reset condition
				matchesChance = true; //reset chance condition
			} else if(line[0] == '#' || line.substr(0,2) == '//') { //comment
				let match;
				if(match = line.match(/^(?:\#|\/\/)\s*Random:\s*(\w*)/i)) {
					if(randomising) //if we were randomising already, apply that
						applyRandom();
					if(match[1] && match[1].length > 0) {
						lastRandomName = match[1];
					}
					randomising = true;
				} else if(match = line.match(/^(?:\#|\/\/)\s*If\s+(\w+)\s+==\s+(.*)/i)) {
					matchesCondition = matchesCondition && ( randomChoices[match[1]] == match[2] );
				} else if(match = line.match(/^(?:\#|\/\/)\s*If\s+(\w+)\s+!=\s+(.*)/i)) {
					matchesCondition = matchesCondition && !( randomChoices[match[1]] == match[2] );
				} else if(match = line.match(/^(?:\#|\/\/)\s*Chance\s*([0-9.,]+):\s*(\w*)$/i)) {
					let choice = Math.random() < parseFloat(match[1]);
					matchesChance = choice;
					if(match[2].length > 0) {
						if(choice)
							randomChoices[match[2]] = "true";
						else
							randomChoices[match[2]] = "false";
					}
				}
			} else if(line[0] == '[' && line[line.length-1] == ']') { //new map name filter
				let filter = line.substr(1, line.length-2);
				filter = filter.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); //Escape any existing special characters, except *
				filter = filter.replace(/\*/g, '.*'); //replace * with .*, which is the RegExp wildcard.
				filter = "^"+filter+"$"; //Require a full title match.
				matchesFilter = new RegExp(filter).test(FileInfo.fileName(map.fileName));
			} else { //Otherwise, this is a map or another rules file:
				if(randomising) {
					if(matchesCondition && matchesChance && matchesFilter)
						randomOptions.push(line);
				} else if(matchesCondition && matchesChance && (matchesFilter || line.substr(line.length-4, 4) == ".txt")) //non-random rules lists always apply regardless of name filters, to match Tiled's behaviour
					map.autoMap(basePath + line);
			}
		}
		if(randomising) //In case the file's over before we apply the last randomisation, apply it:
			applyRandom();
	});
});
randomAutomapAction.text = "Random Automap";

tiled.extendMenu("Map", [
	{ action: "RandomAutomap", before: "AutoMapWhileDrawing" }
]);
