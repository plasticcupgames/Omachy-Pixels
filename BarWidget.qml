import QtQuick
import Quickshell
import qs.Commons
import qs.Ui as Ui

Ui.BarWidget {
    id: root
    moduleName: "plasticcupgames.omachy-pixels"
    readonly property var service: bar && bar.shell ? bar.shell.serviceFor(moduleName) : null
    readonly property bool opened: service ? service.panelOpened : false
    readonly property bool popoutSwitchClosing: false
    readonly property real openPanelIndicatorWidth: content.implicitWidth
    readonly property real openPanelIndicatorHeight: content.implicitHeight
    function monitorName() { var window=button.QsWindow.window; return window && window.screen ? window.screen.name : "" }
    function open() { if(service) service.openSettings(monitorName()) }
    function close() { if(service) service.closeSettings() }
    function toggle() { if(service) service.toggleSettings(monitorName()) }
    function closeForPopoutSwitch() { close() }
    implicitWidth: button.implicitWidth
    implicitHeight: button.implicitHeight
    Ui.WidgetButton {
        id: button
        anchors.fill: parent
        bar: root.bar
        labelVisible: false
        hasVisualContent: true
        dimmed: !root.service
        tooltipText: "Omachy Pixels — click: settings, middle click: pause"
        fixedWidth: root.vertical ? -1 : Math.round(content.implicitWidth + scaledHorizontalMargin*2)
        fixedHeight: root.vertical ? Math.round(content.implicitHeight + scaledVerticalPadding*2) : -1
        onPressed: function(buttonCode) {
            if(buttonCode===Qt.LeftButton) root.toggle();
            else if(buttonCode===Qt.MiddleButton && root.service) root.service.paused=!root.service.paused;
        }
        Item {
            id: content
            anchors.centerIn: parent
            implicitWidth: Style.bar.iconCanvas
            implicitHeight: Style.bar.iconCanvas
            Image { anchors.fill: parent; source: "assets/ship_1.png"; smooth: false; mipmap: false; fillMode: Image.PreserveAspectFit }
        }
    }
}
