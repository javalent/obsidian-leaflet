export default {
    //main.ts
    "Loading Obsidian Leaflet v%1": "加载Obsidian Leaflet版本 v%1", //version number
    "Open Leaflet Map": "打开 Leaflet 地图",
    "Unloading Obsidian Leaflet": "卸载 Obsidian Leaflet 中",
    "Obsidian Leaflet maps must have an ID.":
        "Obsidian Leaflet 地图必须包含 ID.",
    "ID required": "ID 必填",
    "There was an error saving into the configured directory.":
        "保存到配置的目录时出错.",

    //renderer.ts
    "Could not parse GeoJSON file": "无法解析 GeoJSON 文件",
    "Could not parse overlay radius. Please make sure it is in the format `<length> <unit>`.":
        "无法解析覆盖半径. 请确保格式为 `<长度> <单位>`.",
    "There was an error with the provided latitude and longitude. Using defaults.":
        "提供的纬度和经度有误. 使用默认值.",

    //loader.ts
    "There was an issue getting the image dimensions.":
        "获取图片尺寸时出错.",

    //watcher.ts
    "There was an error updating the marker for %1.":
        "更新 %1 的标记(marker)时出错", //file name
    "There was an error updating the marker type for %1.":
        "更新 %1 的标记类型(marker type)出现了错误", //file name
    "There was an error updating the markers for %1.":
        "更新 %1 的标记(markers)出现了错误", //file name

    //utils.ts
    "Coordinates copied to clipboard.": "坐标已复制到剪贴板.",
    "There was an error trying to copy coordinates to clipboard.":
        "尝试复制坐标到剪贴板时出错.",
    "There was an error rendering the map":
        "渲染地图时出错",
    "Unparseable height provided.": "无法解析的高度(height).",
    "There was a problem with the provided height. Using 500px.":
        "提供的显示高度(height)有误. 使用 500px.",
    "Could not parse latitude": "无法解析纬度(latitude)",
    "Could not parse longitude": "无法解析经度(longitude)",
    "No data for marker %1.": "标记(marker) %1 没有数据", //marker code block definition
    "The `%1` field%2 can only be used with the Dataview plugin installed.":
        "只有安装了 Dataview 插件，才能使用`%1`字段`%2`", //parameter name, plural
    "Could not parse location in %1": "无法解析 %1 中的位置", //file name
    "Could not parse map overlay length in %1. Please ensure it is in the format: <distance> <unit>":
        "无法解析 %1 中的地图叠加层长度，请确保其格式为：<距离> <单位>", //file name
    "%1 overlay": "%1 叠加层", //file name
    "Could not parse %1 in %2. Please ensure it is in the format: <distance> <unit>":
        "无法解析 %2 中的 %1，请确保其格式为：<距离> <单位>", //overlayTag, file name

    //units.ts
    meters: "米",
    petameters: "拍米",
    terameters: "太米",
    gigameters: "吉米",
    megameters: "兆米",
    kilometers: "千米",
    hectometers: "百米",
    decameters: "十米",
    decimeters: "分米",
    centimeters: "厘米",
    millimeters: "毫米",
    micrometers: "微米",
    nanometers: "纳米",
    picometers: "皮米",
    femtometers: "飞米",
    feet: "英尺",
    inches: "英寸",
    yards: "码",
    miles: "英里",
    "nautical miles": "海里",

    //settings.ts

    "Obsidian Leaflet Settings": "Obsidian Leaflet 设置",
    "Default Map Marker": "默认地图标记",
    "This marker is always available.": "此标记始终可用",
    "Icon Name": "图标名称",
    "A default marker must be defined.": "必须定义默认标记",
    "The selected icon does not exist in Font Awesome Free.":
        "所选图标不存在于 Font Awesome Free 中",
    "Upload Image": "上传图片",
    "Marker Color": "标记颜色",
    "Layer Base Marker": "图层基本标记",
    "Use as base layer for additional markers by default.":
        "默认情况下，将其用作附加标记的基本图层",
    "Additional Map Markers": "附加地图标记",
    "Add Additional": "添加附加",
    "These markers will be available in the right-click menu on the map.":
        "这些标记将在地图上的右键菜单可选",
    "Default Latitude": "默认纬度",
    "Real-world maps will open to this latitude if not specified.":
        "如果未指定，则使用此纬度作为默认值",
    "Latitude must be a number.": "纬度必须是数字",
    "Default Longitude": "默认经度",
    "Real-world maps will open to this longitude if not specified.":
        "如果未指定，则使用此经度作为默认值",
    "Longitude must be a number.": "经度必须是数字",
    "Reset to Default": "重置为默认值",
    "Please back up your data before changing this setting.":
        "在更改此设置之前，请先备份您的数据",
    "Current directory": "当前目录",
    "Default Config Directory": "默认配置目录",
    "Default Marker Tooltip Behavior": "何时显示默认标记提示",
    "New markers will be created to this setting by default. Can be overridden per-marker.":
        "新创建的标记将会加入到下面，在此处对不同的标记进行自定义设置提示方式", //TODO not understand this feature
    Always: "始终",
    Hover: "悬停",
    Never: "从不",
    "Display Note Preview": "显示笔记预览",
    "Markers linked to notes will show a note preview when hovered.":
        "当鼠标悬停在已经关联笔记的标记上时，会显示关联笔记的预览界面",
    "Display Overlay Tooltips": "显示叠加层提示",
    "Overlay tooltips will display when hovered.":
        "当鼠标悬停在叠加层上时显示提示",
    "Copy Coordinates on Shift-Click": "Shift-单击鼠标左键 时复制坐标",
    "Map coordinates will be copied to the clipboard when shift-clicking.":
        "当按下 Shift 并单击鼠标左键时，地图坐标将被复制到剪贴板",
    "This setting is experimental and could cause marker data issues. Use at your own risk.":
        "此设置是实验性的，可能会导致标记数据出现问题，请自行承担风险。",
    "Import Marker CSV File": "导入标记 CSV 文件",
    "Choose File": "选择文件",
    "Upload CSV File": "上传 CSV 文件",
    "Map not specified for line %1": "第 %1 行未指定地图", //line number in csv
    "Could not parse latitude for line %1":
        "无法解析第 %1 行的纬度1", //line number in csv
    "Could not parse longitude for line %1":
        "无法解析第 %1 行的经度", //line number in csv
    "Marker file successfully imported.": "标记文件已成功导入",
    "There was an error while importing %1":
        "导入 %1 时出错", //csv file name
    "Export Marker Data": "导出标记数据",
    "Export all marker data to a CSV file.":
        "将所有标记数据导出到 CSV 文件",
    Export: "导出",
    "Enable Draw Mode by Default": "默认启用绘制模式",
    "The draw control will be added to maps by default. Can be overridden with the draw map block parameter.":
        "默认情况下，地图会显示绘制控件，可以使用在地图参数配置中自定义关闭控件显示",//TODO not undderstand this feature
    "Default Units": "默认单位",
    "Select the default system of units for the map.":
        "选择地图的默认单位制",
    "Default Tile Server": "默认瓦片服务器(Tile Server)",
    "It is up to you to ensure you have proper access to this tile server.":
        "请确保您有权访问此瓦片服务器",
    "Default Tile Server Attribution": "默认瓦片服务器版权描述",
    "Please ensure your attribution meets all requirements set by the tile server.":
        "请确保您的版权符合瓦片服务器的所有要求，此段将显示在地图右下角",
    "Default Tile Server (Dark Mode)": "默认瓦片服务器（暗黑主题模式）",
    Imperial: "英制",
    Metric: "公制",
    "Only display when zooming out above this zoom.": "仅当缩放级别大于此缩放级别时显示",
    "Only display when zooming in below this zoom.": "仅当缩放级别小于此缩放级别时显示",

    //modals/settings.ts
    "Marker Name": "标记名称",
    "Marker name already exists.": "标记名称已存在",
    "Marker name cannot be empty.": "标记名称不能为空",
    "Font Awesome icon name (e.g. map-marker).": "Font Awesome 图标名称（例如 map-marker）",
    "Use Image for Icon": "使用图片作为图标",
    "Layer Icon": "图标层",
    "The icon will be layered on the base icon.": "图标将叠加在基础图标上",
    "Override default icon color.": "覆盖默认图标颜色",
    Save: "保存",
    "Marker type already exists.": "标记类型已存在",
    "Invalid icon name.": "无效的图标名称",
    "Icon cannot be empty.": "图标不能为空",
    Cancel: "取消",

    //modals/path.ts
    Type: "类型",
    "to link heading": "链接标题",
    "to link blocks": "链接块",
    Note: "注意",
    "Blocks must have been created already": "块必须已经创建。",
//modals/mapview.ts
    "There was an error parsing the JSON.":
    "解析JSON时出错",

    //modals/context.ts
    "Execute Command": "执行命令",
    "The marker will execute an Obsidian command on click":
"点击标记将执行Obsidian命令",
    "Command to Execute": "要执行的命令",
    "Name of Obsidian Command to execute":
"要执行的Obsidian命令名称",
    Command: "命令",
    "Note to Open": "要打开的笔记",
    "Path of note to open": "要打开的笔记的路径",
    Path: "路径",
    "Marker Type": "标记类型",
    Default: "默认",
    "Display Tooltip": "显示提示信息",
    "Min Zoom": "最小缩放级别",
    "Only display when zooming in below this zoom. Current map minimum":
"只有在缩放级别低于此级别时才显示。当前地图最小级别",
    "Minimum zoom must be a number.": "最小缩放级别必须为数字",
    "Max Zoom": "最大缩放级别",
    "Only display when zooming out above this zoom. Current map maximum":
"只有在缩放级别高于此级别时才显示，当前地图最大级别",
    "Maximum zoom must be a number.": "最大缩放级别必须为数字",
    "Associate Tags": "关联标签",
    "Markers created from this tag using ": "属性",
    " will use this marker icon by default.":"指定tag中包含此处填写的tag，则从这个tag创建的地图标记将会使用当前标记图标",
    "Delete Marker": "删除标记",
    "Overlay Radius": "覆盖半径",
    "Circle radius in": "圆的半径为",
    "Radius must be greater than 0.": "半径必须大于0",
    "Overlay Description": "覆盖说明",
    "Overlay Color": "覆盖颜色",
    "Delete Overlay": "删除覆盖",

    //map/view.ts
    "Leaflet Map": "Leaflet 地图",

//map/map.ts
    'Marker type "%1" does not exist, using default.': '标记类型 "%1" 不存在，使用默认值', //标记类型
    "There was an error saving the overlay.": "保存覆盖层时发生错误",
    "There was an error adding GeoJSON to map": "将 GeoJSON 添加到地图时出错",
    "There was an error adding GPX to map": "将 GPX 添加到地图时出错",
    "Edit Overlay": "编辑覆盖层",
    "Create Marker": "创建标记",
//layer/marker.ts
    "No command found!": "未找到命令！",
    "This marker cannot be edited because it was defined in the code block.": "此标记无法编辑，因为它已经在代码块中被使用",
    "This overlay cannot be edited because it was defined in the code block.": "此覆盖层无法编辑，因为它已经在代码块中被使用",
    "Edit Marker": "编辑标记",
    "Convert to Code Block": "转换成代码块",

//layer/gpx.ts
    Lat: "纬度",
    Lng: "经度",
    Time: "时间",
    Elevation: "海拔高度",
    Speed: "速度",
    Pace: "配速",
    Temperature: "温度",
    "Heart Rate": "心率",
    Cadence: "步频",
    spm: "spm",

    //controls/zoom.ts
    "Show All Markers": "显示所有标记",

    //controls/reset.ts
    "Reset View": "重置视图",

    //controls/mapview.ts
    "Edit View Parameters": "编辑视图参数",
    "Save Parameters to View": "保存参数到视图",

    //controls/gpx.ts
    "Zoom to %1 GPX Track%2": "缩放到 %1 条 GPX 轨迹%2", //number of tracks, plural
    Heatlines: "热力线",
    "Zoom to GPX": "缩放到 GPX",
    Deselect: "取消选择",

    //controls/filter.ts
    All: "全部",
    None: "无",
    "Filter Markers": "筛选标记",

    //control/edit.ts
    "Bulk Edit Markers": "批量编辑标记",
    "Delete All": "全部删除",
    marker: "标记",
    markers: "标记",
    "Add New": "添加新的",
    "There was an issue with the provided latitude.": "提供的纬度存在问题",
    "There was an issue with the provided longitude.": "提供的经度存在问题",

    //draw
    Draw: "绘制",
    Polygon: "多边形",
    Polyline: "折线",
    Rectangle: "矩形",
    "Free Draw": "自由绘制",
    "Delete Shapes": "删除形状",
    Done: "完成",
    Text: "文本",
    Color: "颜色",
    "Fill Color": "填充颜色",
    "Move Shapes": "移动形状"
};
