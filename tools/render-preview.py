#!/usr/bin/env python3
"""Render a staged fleet preview using the plugin's actual Canvas and sprite sheets."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
qml = shutil.which('qml') or '/usr/lib/qt6/bin/qml'
source = (root/'Battle.qml').read_text()
canvas = source[source.index('    Canvas {'):source.index('    Timer {\n        interval: Math.round')]
canvas = canvas.replace('Qt.resolvedUrl("assets/"+file)', 'Qt.resolvedUrl("'+root.as_uri()+'/assets/"+file)')
scene = '''import QtQuick
import QtQuick.Window
import "WORLD" as Simulation
Window {
 id: root; width: 1200; height: 720; visible: true; color: "#090d18"
 Rectangle { anchors.fill: parent; color: "#090d18" }
 property var world: new Simulation.World(width,height, function(){return 0.45})
 Image { id: friendlyBulletInfo; source: "BULLET"; visible: false }
 FontLoader { id: pixelFont; source: "FONT" }
 Text { x: 60; y: 42; text: "OMACHY PIXELS"; color: "#ffe600"; font.family: pixelFont.name; font.pixelSize: 36 }
 Text { x: 62; y: 96; text: "A DESKTOP SPACE BATTLE"; color: "#c1c9de"; font.family: pixelFont.name; font.pixelSize: 16 }
 Text { x: 62; y: 656; text: "ART BY TIM HYATT GAMES / PIXELS IN SPACE"; color: "#c1c9de"; font.family: pixelFont.name; font.pixelSize: 14 }
 Component.onCompleted: {
   world.shipScale=2;world.enemyScale=2;world.time=3;
   for(var team=0;team<2;team++)for(var i=0;i<4;i++) {
     world.spawn(team,false);
     var s=world.ships[world.ships.length-1];
     s.file=(team?"enemy_":"ship_")+(team?i+1:i*3+1)+".png";
     s.w=s.h=team && i===1?48:32;
     var angle=team?Math.PI+0.15:-0.22;
     var x=team?850+i*62:450-Math.ceil(i/2)*86;
     var y=team?340+i*76:330+(i%2?1:-1)*Math.ceil(i/2)*72;
     for(var f=0;f<40;f++) {
       s.angle=angle+(f-39)*0.004;
       s.x=x-Math.cos(angle)*(39-f)*3;s.y=y-Math.sin(angle)*(39-f)*3;
       world.updateTrail(s,0.025);
     }
   }
   world.bullets=[{team:0,x:555,y:312,angle:-0.22},{team:1,x:713,y:321,angle:Math.PI+0.15}];
   world.coins=[{x:590,y:450,age:1},{x:620,y:480,age:1}];
 }
 CANVAS
 Timer { interval: 1200; running: true; onTriggered: {
   canvas.requestPaint();capture.start();
 } }
 Timer { id: capture; interval: 200; onTriggered: root.contentItem.grabToImage(function(result){
   if(!result.saveToFile("OUTPUT")){console.error("Could not save preview");Qt.exit(1);}else Qt.quit();
 }) }
}
'''
scene = scene.replace('WORLD',(root/'World.js').as_uri()).replace('BULLET',(root/'assets/bullet.png').as_uri()).replace('FONT',(root/'fonts/Silkscreen-Regular.ttf').as_uri()).replace('CANVAS',canvas).replace('OUTPUT',str(root/'preview.png'))
with tempfile.TemporaryDirectory(prefix='omachy-preview-') as folder:
    path=Path(folder)/'preview.qml'
    path.write_text(scene)
    env=dict(os.environ, QT_QPA_PLATFORM='offscreen', QT_QUICK_BACKEND='software', QT_QPA_PLATFORMTHEME='basic', QT_STYLE_OVERRIDE='Basic')
    subprocess.run([qml,str(path)],env=env,check=True,timeout=15)
print('Rendered preview.png using Battle.qml and the original artwork')
