import QtQuick
import Quickshell
import Quickshell.Io

Item {
    property var shell: null
    property var manifest: null
    readonly property bool initialized: true
    readonly property bool panelOpened: settingsPanel.opened
    function closeSettings() { settingsPanel.opened=false }
    function openSettings(name) {
        if(name) for(var i=0;i<Quickshell.screens.length;i++) if(Quickshell.screens[i].name===name) settingsPanel.screen=Quickshell.screens[i];
        settingsPanel.opened=true;
    }
    function toggleSettings(name) {
        if(settingsPanel.opened && (!name || settingsPanel.screen.name===name)) closeSettings();
        else openSettings(name);
    }
    id: root
    property bool paused: false
    readonly property bool shown: settings.enabled !== false
    property int fps: 30
    readonly property string screenName: settings.screenName || ""
    property var settings: ({shipScale:1, enemyScale:1, frequency:"moderate", area:"full", screenName:"", enabled:true})
    function normalize(value) {
        value=value || {};
        return {enabled:value.enabled !== false, shipScale:[1,2,3].indexOf(value.shipScale)>=0?value.shipScale:1,
            enemyScale:[1,2,3].indexOf(value.enemyScale)>=0?value.enemyScale:1,
            frequency:["high","moderate","light"].indexOf(value.frequency)>=0?value.frequency:"moderate",
            area:["full","top","bottom"].indexOf(value.area)>=0?value.area:"full",
            screenName:typeof value.screenName === "string" ? value.screenName : ""};
    }
    function setSetting(key, value) {
        var copy=Object.assign({},settings); copy[key]=value;settings=normalize(copy);
        settingsFile.setText(JSON.stringify(settings,null,2)+"\n");
    }
    FileView {
        id: settingsFile
        path: (Quickshell.env("XDG_STATE_HOME") || Quickshell.env("HOME")+"/.local/state")+"/omachy-pixels-settings.json"
        preload: true
        atomicWrites: true
        printErrors: false
        onLoaded: { try { root.settings=root.normalize(JSON.parse(text())) } catch(error) { console.warn("Invalid Pixels settings; using defaults:",error) } }
    }
    SettingsWindow { id: settingsPanel; controller: root; screen: battle.screen }
    IpcHandler {
        target: "pixels"
        function pause(): void { root.paused = !root.paused }
        function toggle(): void { root.setSetting("enabled", !root.shown) }
        function boss(): void { if (battle.world) battle.world.boss() }
        function reset(): void { battle.reset() }
        function fps(value: int): void { root.fps = Math.max(10, Math.min(60, value)) }
        function screen(name: string): void { root.setSetting("screenName",name) }
        function status(): string { return JSON.stringify({paused:root.paused, visible:battle.visible, enabled:root.shown, applicationPresent:battle.applicationPresent, fps:root.fps, settings:root.settings,
            monitor:battle.screen ? battle.screen.name : "", monitors:Quickshell.screens.map(s => s.name),
            ships:battle.world ? battle.world.ships.length : 0, coins:battle.world ? battle.world.collected : 0,
            kills:battle.world ? battle.world.kills : 0}) }
        function settings(): void { root.toggleSettings("") }
        function setShipSize(value: int): void { root.setSetting("shipScale",value) }
        function setEnemySize(value: int): void { root.setSetting("enemyScale",value) }
        function setFrequency(value: string): void { root.setSetting("frequency",value) }
        function setArea(value: string): void { root.setSetting("area",value) }
        function quit(): void { if(root.shell) { root.setSetting("enabled",false); root.closeSettings() } else Qt.quit() }
        function setEnabled(value: bool): void { root.setSetting("enabled",value) }
        function show(): void { root.setSetting("enabled",true) }
        function openSettings(name: string): void { root.openSettings(name) }
    }
    Battle { id: battle; controller: root }
}
