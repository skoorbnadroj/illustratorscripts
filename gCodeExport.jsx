#target illustrator
#targetengine main

var settings = {
        nozzleTemp: 240.0,
        bedTemp: 70.0,
        pathWidth: 0.4,
        layerHeight: 0.2,
        zOffset: 0,
        filamentDiameter: 2.85,
        extrusionMultiplier: 1.0,
        printSpeed: 6000,
        travelSpeed: 9000,
        jump: false,
        retraction: false,
        retractionAmount: 3,
        retractionSpeed: 1200
};

var currentArtboard = activeDocument.artboards[activeDocument.artboards.getActiveArtboardIndex()];
var PrintInfoObject = {
        artboardRef: currentArtboard,
        bedHeight: Math.abs((currentArtboard.artboardRect[1] - currentArtboard.artboardRect[3])/(72/25.4)),
        extrudedPathSection: settings.pathWidth * settings.layerHeight,
        filamentSection: Math.PI * Math.sqrt(settings.filamentDiameter/2.0),
        extrusion: 0,
        layer: 1   
};

var onGroup = false;

var win = new Window ('dialog {orientation: "column"}', "GCode Creation Dialog"); // Build a dialog


 // Dialog box items are segmented into groups for layout purposes.
    var inputGroup = win.add('group{orientation: "row"}');
        var settingsGroup = inputGroup.add('panel {orientation: "column",text: "Printer Settings"}');
            settingsGroup.add('staticText', undefined, "Nozzle Temperature ");
            var nTemp = settingsGroup.add ('editText', undefined, "240.0");
            nTemp.characters = 10;
            settingsGroup.add('staticText', undefined, "Bed Temperature ");
            var bTemp = settingsGroup.add ('editText', undefined, "70.0");
            bTemp.characters = 10;
            settingsGroup.add('staticText', undefined, "Nozzle Diameter ");
            var nozzle = settingsGroup.add ('editText', undefined, "0.4");
            nozzle.characters = 10;
            settingsGroup.add('staticText', undefined, "Layer Height ");
            var layer = settingsGroup.add ('editText', undefined, "0.2");
            layer.characters = 10;
            settingsGroup.add('staticText', undefined, "Extrusion Multiplier");
            var multiplier = settingsGroup.add ('editText', undefined, "100");
            multiplier.characters = 10;
            settingsGroup.add('staticText', undefined, "Filament Diameter ");
            var filament = settingsGroup.add ('editText', undefined, "2.85");
            filament.characters = 10;
            settingsGroup.add('staticText', undefined, "Print Speed ");
            var speed = settingsGroup.add ('editText', undefined, "6000");
            speed.characters = 10;
            settingsGroup.add('staticText', undefined, "Travel Speed ");
            var travSpeed = settingsGroup.add ('editText', undefined, "9000");
            travSpeed.characters = 10;
            var jumpBool = settingsGroup.add( "checkbox", undefined, "Apply Jig Jump?" );
            settingsGroup.add('staticText', undefined, "Jig Offset (if Jig Jump is needed) ");
            var offset = settingsGroup.add ('editText', undefined, "0");
            offset.characters = 10;
        var retractionGroup = inputGroup.add('panel {orientation: "column",text: "Printer Settings"}');
            var retractBool = retractionGroup.add( "checkbox", undefined, "Retraction" );
            retractionGroup.add('staticText', undefined, "Retraction Amount ");
            var retractAmount = retractionGroup.add ('editText', undefined, "0.8");
            retractAmount.characters = 10;
            retractionGroup.add('staticText', undefined, "Retraction Speed ");
            var retractSpeed = retractionGroup.add ('editText', undefined, "1800");
            retractSpeed.characters = 10;

     var buttonGroup = win.add('group {orientation: "row"}');
         win.addButton = buttonGroup.add ('button', undefined, "Make GCode");
         win.closeButton = buttonGroup.add('button',undefined, "Close");

    win.closeButton.addEventListener('click', function () {
        win.close();
    });

    win.addButton.addEventListener ('click', function () {
        settings = {
                nozzleTemp: parseFloat(nTemp.text).toFixed(1),
                bedTemp: parseFloat(bTemp.text).toFixed(1),
                pathWidth: parseFloat(nozzle.text),
                layerHeight: parseFloat(layer.text),
                zOffset: parseFloat(offset.text),
                filamentDiameter: parseFloat(filament.text),
                extrusionMultiplier: parseFloat(multiplier.text).toFixed(1) * .01,
                printSpeed: parseInt(speed.text),
                travelSpeed: parseInt(travSpeed.text),
                jump: jumpBool.value,
                retraction: retractBool.value,
                retractionAmount: parseFloat(retractAmount.text),
                retractionSpeed: parseInt(retractSpeed.text)
              };
              
        PrintInfoObject.extrudedPathSection = settings.pathWidth * settings.layerHeight;
        PrintInfoObject.filamentSection = Math.PI * Math.sqrt(settings.filamentDiameter/2.0);

        win.close();
        main();
    });

win.show(); // show the dialog

function main() {
        if (app.documents.length > 0) { 
                var docRef = app.activeDocument;

                if (docRef.selection.length < 1) { 
                        alert('Please select one or more paths'); 
                        return;
                } else if (docRef.selection.length > 0) {
                        var selected = docRef.selection;
                }        

                var file = File.saveDialog('Save GCode File', '*.gcode'); 
                file.open('w');

                startPrint(file, settings);

                var nextPoint;

                // Start Point is first point of path
                // var currentPoint = selected[0].pathPoints[0].anchor;

                // Start point is artboard bottom left
                var currentPoint = purgeSequence(file, PrintInfoObject);

                recursivePrint(file, settings, selected, PrintInfoObject, currentPoint, nextPoint);

        
        endPrint(file);
        file.close();

        alert("Gcode File Saved Successfully!");

        } else {
                alert("Open a document to use");
        } 
}

function recursivePrint(file, settings, item, PrintInfoObject, currentPoint, nextPoint) {
        for(var i = 0; i < item.length; i++) {
                var curItem = item[i];

                file.write("; Layer " + PrintInfoObject.layer + "\n");

                if(curItem.typename == 'GroupItem') {
                        for (var j = 0; j < curItem.pageItems.length; j++) {
                                printPath(file, settings, curItem.pageItems[j], PrintInfoObject, currentPoint, nextPoint);
                        }
                } else if (curItem.typename == 'PathItem') {
                        printPath(file, settings, curItem, PrintInfoObject, currentPoint, nextPoint);                      
                }
                file.write("G92 E0\n");
                PrintInfoObject.extrusion = 0;
                PrintInfoObject.layer++;
        }

}

function printPath(file, settings, item, PrintInfoObject, currentPoint, nextPoint) {
        var points = item.pathPoints;
        var ppi = 72;
        var ppMM = ppi / 25.4;
                        
        if(settings.jump && PrintInfoObject.layer == 1) {
                file.write(";Jump Sequence\n");
                file.write("G1 Z20 F3000\n");
                var jX = PrintInfoObject.artboardRef.artboardRect[0] - points[0].anchor[0]; 
                var jY = PrintInfoObject.artboardRef.artboardRect[1] - points[0].anchor[1];
                var cJX = Math.abs(jX/ppMM).toFixed(3);
                var cJY = Math.abs(jY/ppMM).toFixed(3);
                file.write("G1 X" + cJX + " Y" + Math.abs(cJY - PrintInfoObject.bedHeight).toFixed(3) + " Z20 F3000\n\n");
                currentPoint = points[0].anchor;
        }

        for (var j = 0; j < points.length; j++) {
                var nextPoint = points[j].anchor
                
                // the point converted to artboard coordinates, relative to where you have placed the origin of the coordinate system
                var coords = convertToWorldDimensions(PrintInfoObject, currentPoint, nextPoint);
                var x = coords[0];
                var y = coords[1];

                var distInMM = coords[2];
                var volumeExtrudedPath = PrintInfoObject.extrudedPathSection * distInMM;
                var lengthExtrudedPath = volumeExtrudedPath / PrintInfoObject.filamentSection;

                if (j != 0) {
                        PrintInfoObject.extrusion += lengthExtrudedPath * settings.extrusionMultiplier;
                }

                // write the artboard coordinates to the file
                var z = settings.layerHeight+(settings.layerHeight*(PrintInfoObject.layer-1))+settings.zOffset;
                
                if(j == 0) {
                        if (settings.retraction) {
                                retract(file, settings, x, y, z);
                                PrintInfoObject.extrusion = 0;
                        } else {
                                file.write("G1 X" + x + " Y" + y + " Z" + z + " F" + settings.travelSpeed + "\n");
                        }        
                } else {
                        file.write("G1 X" + x + " Y" + y + " Z" + z + " F" + settings.printSpeed + " E" + PrintInfoObject.extrusion.toFixed(3) + "\n");
                }
                currentPoint = nextPoint;
        }
}

function retract(file, settings, x, y, z) {
        var forwardRetract = 0.12;

        var string = "G92 E0\n";
        string += "G1 E-" + settings.retractionAmount + " F" + settings.retractionSpeed + "\n";
        string += "G1 X" + x + " Y" + y + " Z" + z + " F" + settings.travelSpeed + "\n";
        string += "G1 E" + forwardRetract + " F" + settings.retractionSpeed + "\n";
        string += "G92 E0\n";

        file.write(string);
}

function convertToWorldDimensions(PrintInfoObject, currentPoint, nextPoint) {
        var ppMM = 72 / 25.4;
        var artboard = PrintInfoObject.artboardRef;        

        var currentPtConX = artboard.artboardRect[0] - currentPoint[0]; 
        var currentPtConY = artboard.artboardRect[1] - currentPoint[1];
        var nextPtConX = artboard.artboardRect[0] - nextPoint[0]; 
        var nextPtConY = artboard.artboardRect[1] - nextPoint[1];

        
        // convert point units to Millimeters
        var a = {x: currentPtConX, y: currentPtConY};
        var b = {x: nextPtConX, y: nextPtConY};
        var dist = Math.sqrt( Math.pow((a.x-b.x), 2) + Math.pow((a.y-b.y), 2));
        var distInMM = Math.abs(dist/ppMM).toFixed(3);
        var x = Math.abs(nextPtConX/ppMM).toFixed(3);
        var y = Math.abs(nextPtConY/ppMM).toFixed(3);
        y = Math.abs(y - PrintInfoObject.bedHeight).toFixed(3);

        return [x,y, distInMM];
}

function purgeSequence(file, PrintInfoObject) {
        var artboard = PrintInfoObject.artboardRef;
        var bedHeight = Math.abs((artboard.artboardRect[1] - artboard.artboardRect[3])/(72/25.4));

        var x = [13, 18];
        var y = [8, bedHeight-30];
        var dist = []
        var extrudeArray = [];
        dist[0] = Math.sqrt( Math.pow((0-x[0]), 2) + Math.pow((0-y[0]), 2));
        dist[1] = Math.sqrt( Math.pow((x[0]-x[0]), 2) + Math.pow((y[1]-y[0]), 2));
        dist[2] = Math.sqrt( Math.pow((x[1]-x[0]), 2) + Math.pow((y[1]-y[1]), 2));
        dist[3] = Math.sqrt( Math.pow((x[1]-x[1]), 2) + Math.pow((y[1]-y[0]), 2));

        file.write(";start purge sequence\n");

        for (var i = 0; i < dist.length; i++) {
      
                var volumeExtrudedPath = PrintInfoObject.extrudedPathSection * dist[i];
                var lengthExtrudedPath = volumeExtrudedPath / PrintInfoObject.filamentSection;

                extrudeArray[i] = (lengthExtrudedPath * settings.extrusionMultiplier).toFixed(3);

        }
        PrintInfoObject.extrusion += parseFloat(extrudeArray[0]);
        file.write("G1 X" + x[0] + " Y" + y[0] + " Z0.2 F6000 E" + PrintInfoObject.extrusion + "\n");
        PrintInfoObject.extrusion += parseFloat(extrudeArray[1]);
        file.write("G1 X" + x[0] + " Y" + y[1] + " Z0.2 F6000 E" + PrintInfoObject.extrusion + "\n");
        PrintInfoObject.extrusion += parseFloat(extrudeArray[2]);
        file.write("G1 X" + x[1] + " Y" + y[1] + " Z0.2 F6000 E" + PrintInfoObject.extrusion + "\n");
        PrintInfoObject.extrusion += parseFloat(extrudeArray[3]);
        file.write("G1 X" + x[1] + " Y" + y[0] + " Z0.2 F6000 E" + PrintInfoObject.extrusion + "\n");
        
        file.write("G92 E0\n");
        file.write(";end purge sequence\n\n");
        PrintInfoObject.extrusion = 0;
        return [18, 8];
}

function startPrint(file, settings) {
        file.write("G90\n");
        file.write("M82\n");
        file.write("M106 S0\n");
        file.write("M140 S" + settings.bedTemp + "\n");
        file.write("M109 S" + settings.nozzleTemp +" T0\n");
        file.write("G28\n");
        file.write("G92 E0\n");
        file.write("T0\n");
        file.write("M105\n");
        file.write("T0\n");
        file.write("G92 E0\n\n");
}

function endPrint(file) {
        file.write("G92 E0\n");
        file.write("G1 E-3 F1200\n");
        file.write("G92 E0\n");
        file.write("T0\n");
        file.write("G1 Z20 F6000\n");
        file.write("G1 X0.0 Y0.0 Z20\n");
        file.write("T0\n");
        file.write("G1 X0.0 Y0.0 Z10.0\n");
        file.write("M104 S0 T0\n");
        file.write("M104 S0 T1\n");
        file.write("M140 S0.0\n");
}