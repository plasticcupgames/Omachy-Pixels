import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell
import Quickshell.Wayland

PanelWindow {
    id: root
    required property var controller
    property bool opened: false
    FontLoader { id: pixelFont; source: "fonts/Silkscreen-Regular.ttf" }
    readonly property string pixelFamily: pixelFont.status === FontLoader.Ready ? pixelFont.name : "monospace"
    anchors { top: true; right: true }
    margins { top: 48; right: 12 }
    implicitWidth: 390
    implicitHeight: card.height
    visible: opened
    color: "transparent"
    exclusionMode: ExclusionMode.Ignore
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.namespace: "omachy-pixels-settings"
    WlrLayershell.keyboardFocus: opened ? WlrKeyboardFocus.OnDemand : WlrKeyboardFocus.None
    mask: Region { item: root.contentItem }
    Rectangle {
        id: card
        width: parent.width
        height: content.implicitHeight + 32
        color: "black"; border.color: "#ffe600"; border.width: 2
        Keys.onEscapePressed: root.opened = false
        ColumnLayout {
            id: content
            anchors { left: parent.left; right: parent.right; top: parent.top; margins: 16 }
            spacing: 12
            RowLayout {
                Layout.fillWidth: true
                PixelLabel { text: "Omachy Pixels"; font.pixelSize: 20; Layout.fillWidth: true }
                PixelButton { text: "X"; Layout.preferredWidth: 34; Accessible.name: "Close settings"; onClicked: root.opened = false }
            }
            ChoiceRow { title: "Fleet power"; choices: ["Enable","Disable"]; values: [true,false]; selected: root.controller.shown; onChosen: value => root.controller.setSetting("enabled",value) }
            PixelLabel { text: root.controller.shown ? "Fleet enabled" : "Fleet disabled"; font.pixelSize: 12 }
            ColumnLayout {
                Layout.fillWidth: true
                PixelLabel { text: "Battle monitor" }
                Repeater {
                    model: Quickshell.screens
                    PixelButton {
                        required property var modelData
                        Layout.fillWidth: true
                        selected: root.controller.screenName === modelData.name || (!root.controller.screenName && modelData === Quickshell.screens[0])
                        text: modelData.name + (modelData.name.indexOf("eDP")===0 ? " / Built-in" : " / External")
                        onClicked: root.controller.setSetting("screenName",modelData.name)
                    }
                }
            }
            ChoiceRow { title: "Ship size"; choices: ["1x","2x","3x"]; values: [1,2,3]; selected: root.controller.settings.shipScale; onChosen: value => root.controller.setSetting("shipScale",value) }
            ChoiceRow { title: "Enemy size"; choices: ["1x","2x","3x"]; values: [1,2,3]; selected: root.controller.settings.enemyScale; onChosen: value => root.controller.setSetting("enemyScale",value) }
            ChoiceRow { title: "Frequency"; choices: ["High","Moderate","Light"]; values: ["high","moderate","light"]; selected: root.controller.settings.frequency; onChosen: value => root.controller.setSetting("frequency",value) }
            ChoiceRow { title: "Area"; choices: ["Full","Top","Bottom"]; values: ["full","top","bottom"]; selected: root.controller.settings.area; onChosen: value => root.controller.setSetting("area",value) }
            PixelLabel { text: "Settings save automatically."; font.pixelSize: 12; Layout.fillWidth: true; wrapMode: Text.WordWrap }
            PixelButton { text: root.controller.paused ? "Resume" : "Pause"; Layout.fillWidth: true; onClicked: root.controller.paused = !root.controller.paused }
        }
    }
    component PixelLabel: Label {
        color: "white"
        font.family: root.pixelFamily
        font.pixelSize: 14
        renderType: Text.NativeRendering
    }
    component PixelButton: Button {
        id: control
        property bool selected: false
        implicitHeight: 36
        font.family: root.pixelFamily
        font.pixelSize: 12
        padding: 8
        background: Rectangle {
            color: "black"
            border.color: "#ffe600"
            border.width: control.selected || control.hovered || control.activeFocus ? 3 : 1
            Rectangle { visible: control.selected; color: "#ffe600"; height: 3; width: 12; anchors.bottom: parent.bottom; anchors.bottomMargin: 5; anchors.horizontalCenter: parent.horizontalCenter }
        }
        contentItem: Text {
            text: control.text; color: "white"; font: control.font
            horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
            renderType: Text.NativeRendering
        }
        Accessible.checkable: true
        Accessible.checked: selected
    }
    component ChoiceRow: ColumnLayout {
        id: choice
        required property string title
        required property var choices
        required property var values
        required property var selected
        signal chosen(var value)
        Layout.fillWidth: true
        spacing: 6
        PixelLabel { text: choice.title }
        RowLayout {
            Layout.fillWidth: true
            spacing: 6
            Repeater {
                model: choice.choices
                PixelButton {
                    required property int index
                    required property string modelData
                    selected: choice.selected === choice.values[index]
                    Layout.fillWidth: true
                    Layout.preferredWidth: 1
                    Accessible.name: choice.title + " " + modelData
                    text: modelData
                    onClicked: choice.chosen(choice.values[index])
                }
            }
        }
    }
}
