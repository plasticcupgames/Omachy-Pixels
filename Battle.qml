import QtQuick
import Quickshell
import Quickshell.Wayland
import Quickshell.Hyprland
import "World.js" as Simulation

PanelWindow {
    id: root
    required property var controller
    property var world: null
    screen: {
        var all = Quickshell.screens;
        for (var i=0; i<all.length; i++) if (all[i].name === controller.screenName) return all[i];
        return all.length ? all[0] : null;
    }
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    readonly property var hyprMonitor: Hyprland.monitorFor(root.screen)
    readonly property bool applicationPresent: {
        var monitor=hyprMonitor;
        if(!monitor || !monitor.activeWorkspace) return true;
        if(monitor.activeWorkspace.toplevels.values.length>0) return true;
        var ipc=monitor.lastIpcObject;
        return !!(ipc && ipc.specialWorkspace && ipc.specialWorkspace.id);
    }
    // Defer visibility changes: hiding a layer surface synchronously inside
    // its screen-change binding can re-enter Quickshell's surface teardown.
    property bool desktopAvailable: false
    onApplicationPresentChanged: visibilityUpdate.restart()
    Timer { id: visibilityUpdate; interval: 1; onTriggered: root.desktopAvailable = !root.applicationPresent }
    visible: controller.shown && desktopAvailable
    exclusionMode: ExclusionMode.Ignore
    WlrLayershell.layer: WlrLayer.Bottom
    WlrLayershell.namespace: "omachy-pixels"
    WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
    mask: Region {}
    function applySettings() {
        if(world) { world.configure(controller.settings); canvas.requestPaint() }
    }
    Connections { target: root.controller; function onSettingsChanged() { root.applySettings() } }
    function reset() { world = new Simulation.World(width, height); applySettings() }
    onWidthChanged: if(world) { world.width=width; applySettings() }
    onHeightChanged: if(world) { world.height=height; applySettings() }
    Component.onCompleted: { reset(); visibilityUpdate.restart() }
    // Read the actual supplied twin-shot canvas rather than assuming its orientation.
    Image { id: friendlyBulletInfo; source: "assets/bullet.png"; visible: false }
    Canvas {
        id: canvas
        anchors.fill: parent
        property bool ready: false
        function asset(file) { return Qt.resolvedUrl("assets/"+file).toString() }
        Component.onCompleted: {
            var files = ["bullet.png","enemy_bullet.png","coin_sheet.png","thrusters_sheet.png","enemy_thruster_sheet.png","coin_particle.png",
                "explode_sheet_big.png","explode_sheet_small.png","impact_big_sheet.png","impact_small_sheet.png"];
            for(var i=1;i<=20;i++)files.push("ship_"+i+".png");
            for(var j=1;j<=5;j++)files.push("enemy_"+j+".png");
            for(var k=1;k<=3;k++)files.push("boss_"+k+".png");
            for(var n=0;n<files.length;n++)loadImage(asset(files[n]));
            ready=true;
        }
        onImageLoaded: requestPaint()
        onPaint: {
            var ctx=getContext("2d");ctx.clearRect(0,0,width,height);
            if(!root.world || !ready)return;
            ctx.imageSmoothingEnabled=false;
            var w=root.world;
            ctx.save(); // Location preference never crops sprites or effects.
            function sprite(file,x,y,fw,fh,frame,angle,alpha,scale) {
                var url=canvas.asset(file);if(!canvas.isImageLoaded(url))return;
                ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle||0);
                ctx.scale(scale||1,scale||1);
                ctx.globalAlpha=alpha===undefined?1:alpha;
                ctx.drawImage(url,frame*fw,0,fw,fh,-fw/2,-fh/2,fw,fh);ctx.restore();
            }
            for(var c=0;c<w.coins.length;c++){var coin=w.coins[c];sprite("coin_sheet.png",coin.x,coin.y,24,24,Math.floor(w.time*9)%4,0,Math.min(1,22-coin.age));}
            for(var i=0;i<w.ships.length;i++) {
                var s=w.ships[i], scale=w.scale(s.team);
                var exhaust=w.exhaust(s);
                if(exhaust)for(var t=0;t<s.trail.length;t++) {
                    var trail=s.trail[t],fade=1-trail.age/w.trailLifetime;
                    sprite(exhaust.file,trail.x,trail.y,32,32,trail.frame,trail.angle,0.075*fade*fade,scale*(0.35+0.5*fade));
                }
                if(exhaust)sprite(exhaust.file,s.x-Math.cos(s.angle)*exhaust.offset*scale,s.y-Math.sin(s.angle)*exhaust.offset*scale,32,32,Math.floor(w.time*12)%4,s.angle,0.32,scale*0.85);
                sprite(s.file,s.x,s.y,s.w,s.h,0,s.angle-(w.downward(s)?Math.PI/2:0),1,scale);
            }
            for(var b=0;b<w.bullets.length;b++){var bullet=w.bullets[b];sprite(bullet.team?"enemy_bullet.png":"bullet.png",bullet.x,bullet.y,bullet.team?24:friendlyBulletInfo.implicitWidth,bullet.team?24:friendlyBulletInfo.implicitHeight,0,bullet.angle,1,w.scale(bullet.team));}
            for(var e=0;e<w.effects.length;e++){var fx=w.effects[e];sprite(fx.file,fx.x,fx.y,fx.size,fx.size,fx.particle?0:Math.min(fx.frames-1,Math.floor(fx.age/0.055)),0,fx.particle?1-fx.age/(fx.frames*0.055):1,fx.scale||1);}
            ctx.restore();
        }
    }
    Timer {
        interval: Math.round(1000/root.controller.fps)
        running: root.visible && !root.controller.paused
        repeat: true
        onTriggered: {
            if(!root.world)return;
            root.world.width=root.width;root.world.height=root.height;
            root.world.friendlyBulletAlongHeading=friendlyBulletInfo.implicitWidth>friendlyBulletInfo.implicitHeight;
            var remaining=interval/1000;
            while(remaining>0){var dt=Math.min(remaining,0.05);root.world.step(dt);remaining-=dt;}
            canvas.requestPaint();
        }
    }
}
