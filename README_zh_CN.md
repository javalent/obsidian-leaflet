# Obsidian Leaflet

使用[Leaflet.js](https://leafletjs.com/)插件可以在Obsidian.md 中增加可交互地图的功能 , 

<img src="https://raw.githubusercontent.com/valentine195/obsidian-leaflet-plugin/master/images/7d595a3db9bf0eff9f2a2150819d2bd6956ddcd8.gif">

<img src="https://raw.githubusercontent.com/valentine195/obsidian-leaflet-plugin/master/images/275ff1f560bb6dec0d4fc02b267a7f63860f20c9_2_690x262.jpeg">

目前仅在 Windows 和 Mac 上进行了测试，而且仅仅是对理念的验证，不能保证能完全没有问题。
## 插件使用 & 示例

笔记中新增类型为`leaflet`的代码块，如下:

````markdown
```leaflet
id: leaflet-map
image: [[Image.jpg]]
height: 500px
lat: 50
long: 50
minZoom: 1
maxZoom: 10
defaultZoom: 5
unit: meters
scale: 1
marker: default, 39.983334, -82.983330, [[Note]]
darkMode: true
```
````

## 可选项

> :pencil: 链接的使用
> 
> 下面一些参数会用到链接或者路径，比如图片文件、标记文件等等
>
> 对于文件链接或路径你可以使用Obsidian's的双链链接 (`[[Link]]`) _或_ 标准的markdown链接(`[Link](./path/to/file)`) 。

| 参数                                     | 描述                                                                                           | 默认值                                        |
|----------------------------------------|----------------------------------------------------------------------------------------------|--------------------------------------------|
| [id](#地图ID)                          | 唯一标识符（可以是任何字符）。 **必填**                                                                       |                                            |
| [image](#image-maps)                   | 用作地图图层的图像<sup>[<a href="#ref1">1</a>]</sup>文件的直接URL/文件路径。                                    | OpenStreetMap map                          |
| [tileServer](#real-world-maps)         | 添加额外的瓦片服务器<sup>[<a href="#ref1">2</a>]</sup>作为不同的图层。                                         |                                            |
| [tileOverlay](#real-world-maps)        | 将额外的瓦片服务器添加为底图上的叠加层。                                                                         |                                            |
| [osmLayer](#real-world-maps)           | 关闭OpenStreetMap<sup>[<a href="#ref1">3</a>]</sup>图层(仅在提供了额外的瓦片服务器时才可以使用这个功能。)                |                                            |
| [lat](#initial-coordinates)            | 渲染时显示地图的默认纬度。                                                                                | 50% (image) / 39.983334 (open street map)  |
| [long](#initial-coordinates)           | 渲染时显示地图的默认经度。                                                                                | 50% (image) / -82.983330 (open street map) |
| height                                 | 渲染后的地图在笔记中显示的高度，可以使用像素或笔记高度的百分比。                                                             | 500px                                      |
| width                                  | 选然后的地图在笔记中显示的宽度，可以使用像素或笔记高度的百分比。                                                             | 100%                                       |
| [minZoom](#initial-zoom-level)         | 地图允许的最小缩放级别。                                                                                 | 1                                          |
| [maxZoom](#initial-zoom-level)         | 地图允许的最大缩放级别。                                                                                 | 10                                         |
| [defaultZoom](#initial-zoom-level)     | 地图将会加载此缩放级别。                                                                                 | 5                                          |
| [zoomDelta](#initial-zoom-level)       | 缩放级别间隔。                                                                                      | 1                                          |
| zoomFeatures                           | 地图将自动适应所有[GeoJSON](#geojson)和[GPX](#gpx)要素。                                                  |                                            |
| [unit](#unit-and-scale)                | 距离显示的单位。                                                                                     | meters                                     |
| [scale](#unit-and-scale)               | 图像地图距离计算的比例因子。                                                                               | 1                                          |
| [marker](#markers)                     | 在地图上创建标记:📍                                                                                  |                                            |
| [commandMarker](#defined-in-code-block) | 创建执行命令的标记。                                                                                   |                                            |
| [markerFile](#marker-file)             | 根据笔记的frontmatter创建标记。                                                                        |                                            |
| [markerFolder](#marker-folders)        | 从指定的文件夹中所有笔记提取数据创建标记。                                                                        |                                            |
| [markerTag\*](#marker-tags)            | 指定tag，此插件会从 _所有_ 笔记中找到所有含有此tag的笔记，过滤数据并在当前笔记创建对应标记。                                          |                                            |
| [filterTag\*](#filter-tag)             | Filter what files are used to create markers. Only markers that match the tags will be used. |                                            |
| [linksTo\*](#links)                    | Create immutable markers from _all_ of the notes linking **TO** a note                       |                                            |
| [linksFrom\*](#links)                  | Create immutable markers from _all_ of the notes linking **FROM** a note                     |                                            |
| [darkMode](#dark-mode)                 | 地图颜色 暗黑模式                                                                                    | false                                      |
| [overlay](#overlays)                   | 给地图增加一个圆形覆盖层                                                                                 |                                            |
| [overlayTag](#overlay-tag)             | Define a YAML tag to search for in specified marker notes                                    |                                            |
| [overlayColor](#overlay-color)         | 更改默认覆盖层颜色                                                                                    | blue                                       |
| [bounds](#bounds)                      | 将图像地图边界设置为指定的坐标，而不是默认值。	                                                                     |                                            |
| [coordinates](#initial-coordinates)    | 从一个笔记中读取位置数据，并将其用作初始坐标。                                                                      |                                            |
| [zoomTag](#initial-zoom-level)         | 从一个笔记中读取距离缩放数据，并将其用作初始的默认缩放值。                                                                |                                            |
| [geojson](#geojson)                    | 指定GeoJSON文件路径，将GeoJSON文件加载到地图上。                                                              |                                            |
| [geojsonColor](#styles-and-color)      | 更改GeoJSON要素的默认颜色。                                                                            | #3388ff                                    |
| geojsonFolder                          | 解析指定文件夹里所有的.geojson或.json后缀格式的文件，并加载到地图上。                                                    |                                            |
| [gpx](#gpx)                            | 指定GPX文件路径，将GPX文件加载到地图上。                                                                      |                                            |
| [gpxMarkers](#gpx-markers)             | 设置默认的起始、终止和途经点标记。                                                                            |                                            |
| gpxColor                               | 控制默认的GPX颜色。                                                                                  | #3388ff                                    |
| gpxFolder                              | 解析指定文件夹里所有的.gpx后缀格式的文件，并加载到地图上。                                                              |                                            |
| [imageOverlay](#image-overlays)        | 向地图添加一个图像覆盖层。                                                                                |                                            |
| [draw](#enable-draw-mode-by-default)   | 在地图上启用绘制控制器。                                                                                 | true                                       |
| drawColor                              | 新形状绘制时使用的默认颜色。                                                                               | #3388ff                                    |
| showAllMarkers                         | 地图将显示所有标记。                                                                                   | false                                      |
| preserveAspect                         | 如果调整地图所在的笔记窗格大小，则地图将调整大小以保持其初始纵横比。                                                           | false                                      |
| noUI                                   | 是否添加地图控制按钮空间。                                                                                | false                                      |
| lock                                   | 是否默认锁定地图。                                                                                    | false                                      |
| recenter                               | 是否在拖动地图后强制重新居中。                                                                              | false                                      |
| noScrollZoom                           | 是否禁用滚轮缩放。                                                                                    | false                                      |

> \*: 带'*'的参数需要提前安装 [DataView 插件](https://github.com/blacksmithgu/obsidian-dataview)才支持的功能。

### YAML 语法
从版本 **3.11.0** 开始，所有参数都可以使用 YAML 语法来定义，而不需要使用多个相同的标签。原始语法仍然有效，但不能将两种语法混合使用。换句话说，如果您想使用 YAML 语法定义参数，则不能再使用原始语法来定义参数。
示例如下:

````
```leaflet
image:
    - [[Image 1]]
    - [[Image 2]]
    - [[Image 3]]
marker:
    - [<type>, <lat>, <long>, <link>]
    - [<type>, <lat>, <long>, <link>]
```
````

#### YAML中的Marker Tags
YAML considers the `#` symbol to be a comment, so the `markerTag` or `filterTag` parameters must either be wrapped in quotes (`"#tag"`) or defined without the `#` symbol.

#### Links
I

## 地图ID
从版本3.0.0开始，地图需要一个ID。如果打开一个包含旧的地图块的笔记，插件将会警告你该地图现在需要一个ID。    
一旦旧地图被分配了一个ID，插件将尝试将标记数据与新地图关联起来。  
在更新到3.0.0后第一次打开插件时，将创建一个标记数据备份以防需要降级。如果您遇到问题，请在Github上创建一个ISSUE。  
## 初次加载地图时的设置

### 初始坐标
地图将会打开属性`lat`和`long`指定的纬度和经度处。如果未提供，则使用默认设置中定义的纬度和经度。  
另外，可以使用`coordinates`参数定义纬度和经度。坐标可以定义为数字数组，也可以定义为链接到具有“location”前置标签的笔记的wikilink：

```
coordinates: [36, -89]
coordinates: [[Frontmatter带有位置的的笔记]]
```

### 初始缩放等级

> :warning: 使用图像地图吗？
>
> 缩放级别和图像地图可能有点不直观。
>
> 请查看下面的[使用图像地图缩放](#zooming-with-image-maps)。

地图的初始缩放级别可以使用`defaultZoom`参数进行设置。值必须是在`minZoom`和`maxZoom`参数之间的数字，如果超出数值范围，则会被设置为最接近的数值(maxZoom或minZoom)。

另外，如果已经定义了一个`coordinates`笔记，则初始缩放级别可以从该笔记的 frontmatter 中读取为`<distance> <unit>`。

例如，如果笔记具有以下 frontmatter：

```
### Note With Frontmatter.md
---
location: [-36, 89]
nearby: 100 mi
---
```

并且地图像这样定义：

```leaflet
coordinates: [[Note With Frontmatter]]
zoomTag: nearby
```

那么地图将读取 `nearby` 属性值作为缩放的值，并识别出它是 `100 英里`，并将地图的初始缩放级别设置为最接近可以显示 100 英里的级别（这取决于 `minZoom`、`maxZoom` 和 `zoomDelta`）。
## 真实世界地图

如果未提供 `image` 参数，则会创建真实世界地图。这些地图默认加载 `OpenStreetMap` 地图，但可以使用 `tileServer` 参数提供其他瓦片服务器。

 **请确保您使用的瓦片服务器可以公开使用。**

目前，需要 `API` 访问权限的瓦片服务器无法使用。

如果提供了其他瓦片服务器，可以使用 `osmLayer: false` 参数关闭 `OpenStreetMap` 图层。

### 瓦片服务器

如上所述，可以使用 tileServer 和 tileOverlay 参数添加其他瓦片服务器。两者具有相同的语法：

`tileServer: <domain>|<alias（可选）>`

例如:

```md
tileServer: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark

---

tileServer:

-   https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark
-   https://tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png|Hills
```
在 `tileServer` 中指定的瓦片服务器将作为其他可完全切换的 **图层** 添加。

### 瓦片覆盖层

使用 `tileOverlay` 属性而不是 `tileServer`属性将会使瓦片服务器成为覆盖层被添加到基础地图之上。

可以通过在末尾添加 `|on` 来将瓦片覆盖层设置为默认打开：
```md
tileServer: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark|on
```

## 图像地图

> **:warning: 制作图像地图?**
>
> 对于图像地图，强烈建议您首先设置您的[边界](#bounds)。
>
> 这样会使您处理图片的时侯更轻松！
>
> 请阅读有关该过程的[讨论](https://github.com/valentine195/obsidian-leaflet-plugin/discussions/130) about the process. Josh Plunkett has also made a great video breaking down the process [here](https://www.youtube.com/watch?v=54EyMzJP5DU).

### 图像地图的URL/文件路径

有三种方式可以加载图像地图：

1. 直接URL (例如, https://i.imgur.com/jH8j3mJ.jpg)
2. Obsidian URL (例如, obsidian://open?vault=VaultName&file=Path/To/Image.jpg)
3. 图像的Obsidian wiki链接 (例如, [[Image.jpg]])

### 使用图像地图进行缩放

您可能会注意到基本的图像地图和缩放并不像您想象的那样。例如，您可能会发现将最大缩放值设置得更高只会使地图“开始得更远”，而不是实际上允许您更多地缩放。

这是因为图像地图本质上是在LeafletJS模块之上进行的一种特殊操作。在上面仍然存在一个具有其纬度和经度的基础地图，只是您看不到它。然后LeafletJS会在该地图上绘制图像（居中于[0,0]），然后拉伸以适应大小。如果更改参数（例如缩放级别），则更改基础地图...但图像仍然被**放置在[0,0]并拉伸以适应！**

相反，需要为您的地图设置[图像边界](#bounds)。这会告诉Leaflet在底层地图层上将图像放置在哪些坐标位置。无论地图实例如何更改，图像始终位于同一位置且大小相同，**每次都是如此！**

### 多图像地图

可以通过为插件提供多个图像，这样图片就会被一起展示在地图上:
````markdown
```leaflet
id: Map With Layered Images
image:
    - [[Image1.jpg|Optional Alias]]
    - [[Image2.jpg]]
    - [[Image3.jpg]]
```
````
这将生成一个有三个层的地图。图像1位于顶部，图像2位于中间，图像3位于底部。这些图像将以它们的中心点为中心对齐。  
地图右上方的控制框将允许您更改显示层。  
可以在每个层上分别创建和保存标记。  
如果给定图片别名，图层控制框将显示给定的别名而不是文件名。   

### ### 范围
使用 `bounds` 参数可以为图像地图设置自定义范围：

````
```leaflet
image: [[Image.jpg]]
bounds:
    - [<左上角纬度>, <左上角经度>]
    - [<右下角纬度>, <右下角经度>]
```
````

这会让图像地图的纬度和经度被更新以适合于给定的范围。_如果提供的范围与图像的宽高比不匹配，则会扭曲图像。_
地图上定义的任何标记或覆盖层都不会被更新。

### 图像地图的纬度和经度
由于图像地图没有真正的坐标系，所以提供的纬度和经度必须作为相对于**图像左上角的百分比**给出。
如果不更改地图的默认缩放级别，这个设置可能看起来好像不起作用。

### 单位和比例
如果提供了，插件将通过 `scale` 缩放计算出的两点之间的距离，并以 `xxx unit` 的形式显示结果。
在现实世界的地图中，只需要提供 `unit:`, 它将尝试将测量从“米”缩放到指定的“unit”单位。
可以使用 `bounds` 参数为图像地图指定自定义边界：

````
```leaflet
image: [[Image.jpg]]
bounds:
    - [<top-left-latitude>, <top-left-longitude>]
    - [<bottom-right-latitude>, <bottom-right-longitude>]
```
````

## 标记  
通过单击右键可以在地图上添加新标记。   
如果在设置中创建了其他标记类型，则将显示一个供选择列表。  
创建标记后，可以将其拖动到其他位置。  
在地图上创建的标记将保存到地图实例中。以这种方式保存的标记数据将持久存在，只要地图与一个笔记相关联 - 如果地图块从笔记中删除，或者所有包含地图块的笔记都被删除，与其关联的数据将在7天后被删除。  
### 标记缩放级别断点  
给定缩放级别断点的标记将在地图缩放到断点以上或以下时从地图上删除。    
可以在地图上创建的标记的右键菜单中设置这些断点，也可以使用源块中创建标记的参数（有关更多信息，请参见[在代码块中定义的对象](#objects-defined-in-the-code-block)）。  
要小心！确保断点在地图的缩放范围内，否则可能永远无法显示标记！  

### 标记坐标
在标记上按 <kbd>Alt</kbd> 或 <kbd>Shift</kbd> 单击将显示其坐标。

### 标记链接
一个标记也可以指向一个笔记；右键单击标记，弹出一个弹窗。目标可以输入为笔记的名称。此外，笔记中的标题或块也可以是标记的目标:  
`Note`  
`Note#Header1`  
如果您有多个名称相同的笔记，则应指定到该笔记的直接路径。否则，地图可能会打开您不希望打开的笔记。  
一旦链接，单击将打开笔记（<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>-单击可在新窗口中打开）。  
此外，可以通过从文件树中拖动笔记并将其放在地图上来创建标记。  
标记链接也可以设置为外部网站。单击标记将打开该网站。

#### Obsidian 命令作为链接
标记链接也可以设置为从命令面板中定义的 Obsidian 命令。    
该命令必须是它在面板中出现的完整名称。  
**将标记链接设置为命令将在单击标记时执行该命令。**  

> ##### **警告**
>
> 使用命令作为标记目标可能会产生意想不到的后果。
>
> 请参考 [此问题](https://github.com/valentine195/obsidian-leaflet-plugin/issues/38) 进行了解。

##### 在代码块中定义
使用 `commandMarker:` 代替 `marker:`  

##### 在地图上创建  
打开 `Command Marker` 切换。  

### 批量编辑  
从版本 3.9.0 开始，地图上添加了一个批量编辑按钮。点击此按钮将打开一个模态框，可轻松编辑地图上定义的所有可变标记。  

## 叠加层

通过<kbd>Shift</kbd>-右键单击、拖动鼠标以设置半径并再次单击，可以将叠加层添加到地图中。按下<kbd>Escape</kbd>将取消绘制并删除叠加层。以这种方式添加到地图中的叠加层与标记一样保存到地图实例中，在重新打开地图时将重新创建。

此外，可以在源块中使用`overlay`参数指定叠加层，如下所示：

`overlay: [<color>, [<lat>, <long>], <radius> <unit?>, <desc>]`

或

```
overlay:
    - [<color>, [<lat>, <long>], <radius> <unit?>, <desc>]
    - [<color>, [<lat>, <long>], <radius> <unit?>, <desc>]
    ...
```

这将在`<lat>，<long>`为中心，半径为`<radius>`、单位为`<unit>`的`<color>`叠加层圆形。

> **请注意**
>
> 叠加层按指定的顺序绘制。如果一个较小的叠加层被一个更大的遮盖，那么较小的叠加层将无法交互。

`<color>`可以是任何有效的 CSS 颜色，包括十六进制、`rgb()`和`hsl()`。请注意，由于 YAML 语法，以`＃`开头的字符串和具有逗号的条目必须用引号括起来。

例如：

````
```leaflet
overlay: [blue, [32, -89], 25 mi, '这是我的叠加层！']
```

````
````
```leaflet
overlay:
  - ['rgb(255, 255, 0)', [32, -89], 25 km, '这也是我的叠加层！']
  - ['#00FF00', [32, -89], 500 ft, '这是第三个叠加层！']
```
````

### 编辑叠加层
在地图上直接绘制的叠加层可以进行编辑。可以通过右键单击叠加层来更改半径和颜色，或者删除叠加层。

### 使用笔记正文创建叠加层
与标记类似，可以使用`markerFile`、`markerFolder`和`markerTag`参数来从笔记中创建叠加层。可以使用`filterTag`参数基于标签来过滤要使用的文件。  
插件将扫描笔记的正文，并从前置数据（frontmatter）中生成叠加层，其格式与上文介绍的相同。  

### 叠加层标签
可以使用叠加层标签参数从笔记的前置数据（frontmatter）自动生成叠加层。

示例:
````
```leaflet
overlayTag: nearby
```
````

笔记前置数据（frontmatter）:
````
---
nearby: 50 km
---
````

### 叠加层颜色
可以使用叠加层颜色标签来指定绘制地图或使用叠加层标签参数时的默认叠加层颜色。

## 图像叠加层

可以使用`imageOverlay`参数在代码块中添加图像叠加层。

该参数使用以下语法：
````
```
leaflet
imageOverlay:
- [[图片文件|可选别名]，[左上角坐标]，[右下角坐标]]
- [[图片文件2|可选别名]，[左上角坐标]，[右下角坐标]]
- ...
```
````
这将在两个坐标边界之间添加一个图像叠加层。如果未提供坐标边界，则叠加层将：

1. 在图像地图上，覆盖整个图像。
2. 在实际地图上，覆盖初始地图视图。

可以使用右上角的图层控制框切换图像叠加层的开启或关闭。与具有多个图层的地图类似，如果提供了可选别名，则图层框将显示别名而不是文件名。 
## GeoJSON
GeoJSON是一种用于描述地理数据结构的格式，如点、线和形状。请参见[此文档](https://datatracker.ietf.org/doc/html/rfc7946)获取完整的GeoJSON格式参考。  
可以使用以下语法将GeoJSON加载到地图中：  
````
```leaflet
geojson: [[GeoJSON_File.json]]|optional-alias
```
````
或者
````
```leaflet
geojson:
  - [[GeoJSON_File.json]]
  - [[GeoJSON_File_2.json]]|optional-alias|[[optional-note-wikilink]]
```
````
请注意，GeoJSON按照提供的顺序绘制。如果一个较小的文件重叠了一个较大的文件，则可能无法与它交互。  
特别大或大量的GeoJSON文件可能会减慢初始渲染速度。   

### 链接注释
GeoJSON文件可以通过在末尾添加`|[[]]`来链接到注释。  
请注意，链接到注释时需要提供别名。  

### 样式和颜色   
GeoJSON要素的默认颜色可以在地图的代码块中使用`geojsonColor`参数定义。此颜色必须是有效的CSS颜色。  
此外，地图将尝试读取为GeoJSON要素定义的样式属性以应用样式。应使用[MapBox SimpleStyle规范](https://github.com/mapbox/simplestyle-spec/tree/master/1.1.0)定义样式。  

### 工具提示
地图将尝试读取GeoJSON要素的标题以在悬停时显示工具提示。此标题应在GeoJSON要素属性的`title`、`description`或`name`字段中定义。  

## GPX
GPX（GPS交换格式）文件可以使用`gpx`参数添加到地图中，类似于将GeoJSON文件添加到地图中。  
想要在Obsidian中显示您的Apple Health锻炼数据吗？按照[这些步骤](https://support.apple.com/guide/iphone/share-health-and-fitness-data-iph27f6325b2/ios)，然后将导出的GPX文件添加到您的vault中，并在地图中使用！  

````
```leaflet
gpx: [[GPX_File.gpx]]
```
````

或者
````
```leaflet
gpx:
  - [[GPX_File.gpx]]
  - [[GPX_File 2.gpx]]
```
````

注意特别大的或大量的GPX文件可能会导致渲染速度变慢。
### GPX标记

默认情况下，地图不会在起点、终点或定义的途经点上显示标记。可以使用`gpxMarkers`参数告诉地图使用您在设置中定义的标记类型:
````
```leaflet
gpx: [[GPX_File.gpx]]
gpxMarkers:
  start: start_marker_type
  waypoint: waypoint_marker_type
```
````

### GPX数据

GPX文件被解析为可以在地图上显示为热线的数据点。单击GPX路线将打开一个控制框，在该控制框中可以选择这些数据点。将鼠标悬停在轨迹上的某个点上，将显示该特定点的信息。

当前从GPX文件中解析出的数据为:

1. 脚步频率
2. 海拔高度
3. 心率
4. 速度

如果文件中缺少任何这些数据，则它将不是一个正常的数据。

## 代码块中定义的对象

可以使用以下语法在代码块中直接定义标记（Marker）和覆盖物（Overlay）：

| 类型     | 语法                                                                                  |
| -------- | ------------------------------------------------------------------------------------- |
| Marker  | `marker: <type*>,<latitude>,<longitude>,<link*>,<description*>,<minZoom*>,<maxZoom*>` |
| Overlay | `overlay: [<color*>, [<latitude, longitude>], <radius*>, <description*>]`             |

可以定义任意数量的对象，但是 _这些对象都不可编辑_ 。如果需要更改这些对象，则必须编辑代码块。

标记链接可以定义为Obsidian的wikilink。

> \*: 这些参数是可选的，并且在定义中可以留空。
> 例如，`marker: ,25,25,,,3`将使用默认标记类型、纬度和经度25，无链接、无描述，minZoom为3，无maxZoom。


**这些内容将不会包含在导出的数据中。**

### 标记文件（Marker Files）、标记文件夹（Marker Folders）、标记标签（Marker Tags）和链接中的标记（Markers from Links）
这些参数允许您直接从指定的笔记文件创建标记。  
在代码块中定义的这些参数的数量没有限制；所有找到的文件都将被解析以查找已定义的标记。  
_请注意，除非未来版本中增加缓存功能，否则定义大量标记文件可能会影响性能。_  

#### 笔记Frontmatter
`markerFile`、`markerFolder`、`markerTag`、`filterTag`、`linksTo`和`linksFrom`参数告诉插件在哪里查找笔记。笔记本身使用笔记正文标签确定如何创建标记。
从笔记中创建的所有标记（markers）将自动将其链接设置为该笔记。

| 前置数据的tag（Frontmatter Tag) | 功能                                        |
|------------------------------|-------------------------------------------|
| location | 在此位置创建标记，如果 `coordinates` 参数指向此笔记，也会使用此位置。 | 
| mapmarker | 为使用 location 创建的标记使用此标记类型，可选。             | 
| mapzoom | 从此笔记创建的标记将其缩放断点设置为 [`min`，`max`]。可选。          |
| mapmarkers | 要创建的标记数组。有关语法，请参见下文。                      |
| mapoverlay | 要创建的覆盖层数组。有关语法，请参见下文。                     |

##### mapmarker
`mapmarker` 参数可用于定义创建的标记类型。这可以是以下两种情况之一：
1. 设置中给出的标记类型名称。
2. 一个定义，定义图标名称、颜色以及是否将图标叠加在默认标记类型上。
   示例:

```
mapmarker: event    # 已提前在设置中创建了一个名为“event”的标记类型。

# OR

mapmarker:
  icon: user        # Font Awesome 图标名称。
  color: 00ff00     # 十六进制颜色字符串。可选。
  layer: false      # 是否叠加。可选。
```

##### mapmarkers

`mapmarkers` 参数可用于定义要在地图上显示的任意数量的标记,这不需要设置 `location` 标签。
使用 `mapmarkers` 定义的标记应具有以下语法：
```
---
mapmarkers:
  - [<type>, [<latitude>, <longitude>], <optional description>, <optional minZoom>, <optional maxZoom>]
  - [<type>, [<latitude>, <longitude>], <optional description>, <optional minZoom>, <optional maxZoom>]
  - ...
---
```

##### mapoverlays

`mapoverlay` 参数可用于定义要在地图上显示的任意数量的叠加层,这不需要设置 `location` 标签。
使用 `mapoverlay` 定义的覆盖层应具有以下语法：

```
---
mapoverlay:
  - [<color>, [<latitude>, <longitude>], <radius> <unit?>, <optional description>]
  - [<color>, [<latitude>, <longitude>], <radius> <unit?>, <optional description>]
  - ...
---
```

如上所示，叠加层的半径应使用 `<radius> <unit>`（例如 `100 miles`）指定。如果未提供 `<unit>`，则默认为 `meters`。请参见 [此处](src/utils/units.ts) 获取支持的单位列表。  
#### 标记文件（markerFile）  
标记文件可以使用以下语法在代码块中定义：  
`markerFile: [[WikiLinkToFile]]` **或**  
`markerFile: Direct/Path/To/Note`  

#### 标记文件夹（markerFolder）
标记文件夹可以使用以下语法在代码块中定义：  
`markerFolder: Direct/Path/To/Folder`  

这将在指定文件夹中搜索 _所有_ 笔记，也包含子文件夹的所有文件。  

#### 标记标签（markerTag）
如果您安装了 [Dataview 插件](https://github.com/blacksmithgu/obsidian-dataview)，则可以使用以下语法从标签创建标记：  
`markerTag: <tag>, <tag>, ...`

**请注意：插件使用YAML解析代码块，因此使用`#`定义的标签\*将不起作用\*，除非用引号包裹（`"#tag"`）。**  
每个`markerTag`参数将返回具有该参数中定义的所有标签的笔记。如果您要查找包含 _任何_ 列出的标记的文件，请使用单独的`markerTag`参数。  
例如：
````
```
markerTag:
  - tag1
  - [tag2, tag3]
  - tag4
```
````
上述代码将解析：
1. 任何包含 `tag1` 的笔记。
2. 同时包含 `tag2` **和** `tag3` 的所有笔记。
3. 任何包含 `tag4` 的笔记。

> 注意：即使笔记匹配多个条件，笔记也只会被解析一次。

#### Filter Tag
可以使用 `filterTag` 参数过滤返回的文件。  
该参数使用与 `markerTag` 相同的语法，但是与添加文件不同，它要求使用 `markerFile`、`markerFolder` 或 `markerTag` 找到的每个文件都匹配一组标记。

#### 链接（Links）
`linksTo` 和 `linksFrom` 参数使用 `DataView` 的链接索引查找链接到或从参数中指定的笔记链接的笔记，使用与上面相同的语法构建不可变标记。
请注意：`links` 参数都需要安装 [Dataview 插件](https://github.com/blacksmithgu/obsidian-dataview)。
可以使用 YAML 数组语法指定多个文件：
```
linksTo: [[File]]
linksFrom:
    - [[File 1]]
    - [[File 2]]
```

#### 示例

```
markerFile: [[MarkerFile]]
```

将会产生以下效果
1. 加载MarkerFile.md笔记文件，如果它有正确的frontmatter字段，则创建一个标记。
1. Load the MarkerFile.md note file and, if it has the correct frontmatter fields, create a marker for it. //TODO

```
markerFile: [[MarkerFile]]
markerFolder: People and Locations
```

将会产生以下效果

1. 加载MarkerFile.md笔记文件
2. 查找“People”和“Locations”文件夹中其他笔记。

```
markerTag: #location, #friends
```

将会产生以下效果
1. 查找所有tag为 `#location` **和** `#friends` 的笔记，并使用它们的 frontmatter 创建标记。

```
markerFolder: People and Locations
markerFolder: Interests/Maps of the World
markerTag: #people, #friends
markerTag: #Paris
```
将搜索符合以下条件的笔记：
1. 在 People 和 Locations 或 Interests/Maps of the World 文件夹中；且
2. 包含标签 #people 和 #friends，或标签 #Paris。

## 距离
在地图或标记上按下 <kbd>Shift</kbd> 或 <kbd>Alt</kbd> 键，然后再按一次 <kbd>Shift</kbd> 或 <kbd>Alt</kbd> 键，可以显示两点之间的距离。
距离以米为单位显示，除非在地图块中指定了比例因子和/或单位。
位于地图左下角的控制框显示了最后计算的距离。将鼠标悬停在该框上会在地图上显示距离线，单击该框会将地图缩放到这些坐标。

## 暗模式（Dark Mode）
`darkMode` 参数将使用 CSS 反转地图的颜色。这是通过将 `.dark-mode` CSS 类应用于地图瓷砖层，以及以下 CSS 来完成的：

```css
.leaflet-container .dark-mode {
    filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(
            0.3
        ) brightness(0.7);
}
```

Overriding this CSS in a custom snippet will allow for customization of the dark mode appearance. For a reference to the CSS `filter` property, please see [this article](https://developer.mozilla.org/en-US/docs/Web/CSS/filter).

## 设置

### 标记 CSV 文件（Marker CSV Files）

标记数据可导出为 CSV 文件。此数据采用以下格式：

| Column 1 | Column 2    | Column 3 | Column 4  | Column 5    | Column 6     | Column 7  |
| -------- | ----------- | -------- | --------- | ----------- | ------------ | --------- |
| Map ID   | Marker Type | Latitude | Longitude | Marker Link | Marker Layer | Marker ID |
| 地图 ID | 标记类型 | 纬度 | 经度 | 标记链接 | 标记图层 | 标记 ID |
如果留空，则标记类型默认为 "default"。  
如果地图只有一个图层，则可以将标记图层保持为空白。    
对于新的标记，标记 ID 可以保持空白。  
然后可以重新导入此格式的标记数据。此功能仍在开发中，可能无法正常工作。  


### 默认标记工具提示行为
设置此项将使标记工具提示默认为此行为。
您可以在标记的右键上下文菜单中覆盖此行为。

### 默认启用绘制模式
如果禁用，则绘制控制器不会添加到地图中，除非在地图块中将 `draw` 参数设置为 `true`。

### 显示笔记预览
在悬停链接的标记时使用 Obsidian 的笔记预览。  
**请注意，必须启用 Obsidian 页面预览核心插件才能使用此功能。  **

### 显示覆盖层工具提示
如果禁用此选项，则默认情况下不会显示覆盖层工具提示。这可以在覆盖层上下文菜单中按覆盖层进行更改。  
目前无法更改不可变覆盖层的此设置。

### 按 Shift-单击 复制坐标
打开此设置将在地图上任意位置按<kbd>Ctrl</kbd> + <kbd>Shift</kbd>-单击 时将纬度和经度坐标复制到剪贴板中

### 纬度和经度
如果没有提供，则会打开一个现实世界地图到这个默认的纬度和经度。

### 默认地图标记
默认标记设置允许您定义其他标记可以在其上叠加的标记。如果没有添加其他标记，则右键单击地图将放置此标记。

#### 标记图标
[Font Awesome Free](https://fontawesome.com/icons?d=gallery&p=2&s=solid&m=free) 图标的名称。

#### 标记颜色
标记颜色的选择器。

#### 图层基础标记
默认情况下，其他标记将放置在此标记之上。可以在特定的其他标记上覆盖此设置。

### 其他标记
可以添加其他标记类型，并在地图上的上下文菜单中选择。

#### 创建其他标记
添加新标记会显示一个新窗口，在其中可以添加新标记参数。
### 添加标记

| 参数              | 描述                                                                                                   |
|-----------------|------------------------------------------------------------------------------------------------------|
| Marker Name     | 添加标记时在上下文菜单中显示的名称（例如，位置、事件、人物）                   |
| Marker Icon     | 要使用的 [Font Awesome Free](https://fontawesome.com/icons?d=gallery&p=2&s=solid&m=free) 图标名称 |
| Upload Image    | 上传自定义图像以用作标记图标，而不是使用 Font Awesome 图标                |
| Layer Icon      | 在基础标记的顶部添加该图标。如果关闭，将使用该图标本身。                     |
| Icon Color      | 覆盖默认图标颜色。                                                                     |
| Associated Tags | 不可变标记将使用此标记类型，如果文件具有此标签 _且未设置 `mapmarker`_。   |

如果开启了图层图标，可以通过点击和拖动来移动图标并自定义图标的图层位置。如果按住 <kbd>Shift</kbd> 移动图标，它将吸附到中线上。

#### 使用图像作为标记图标（Marker Icon）

在创建附加标记时，可以上传图像以用作标记图标，而不是选择 Font Awesome 图标。

单击 "Upload Image" 按钮并选择要使用的图像。插件将加载图像并将其缩放为 `24px x 24px`。上传标记时使用的图像无法编辑。

如果已上传图像，则选择 Font Awesome 图标将删除该图像。
#### 关联标签
将标签与标记类型关联。

#### Associated Tags
如果使用 `markerFile`, `markerFolder`, 或 `markerTag` 找到了笔记，插件将首先使用frontmatter的 `mapmarker` 参数来确定标记类型。如果未设置，则将使用笔记的标签来查找与其中一个标签关联的标记类型。
标签按照在标记类型上定义的顺序进行搜索。

# Initiative Tracker 插件集成
如果安装了[Initiative Tracker](https://github.com/valentine195/obsidian-initiative-tracker) 插件，可以从 Initiative Tracker 视图打开战斗地图。
这个战斗地图将预先加载已加载战斗中的任何活动生物作为标记。可以为 PC 和 NPC 设置默认标记类型，并且可以进一步设置每个生物将使用哪种标记类型。
战斗地图将其状态与 Initiative Tracker 战斗同步 - 随着生物被添加、删除等，它们的状态将在地图上更新。

# 版本历史

查看本插件的 [变更历史](https://github.com/valentine195/obsidian-leaflet-plugin/blob/master/CHANGELOG.md).

# 安装

## 从Obsidian插件市场中安装
从 Obsidian v0.9.8 开始，您可以通过以下方式在 Obsidian 中激活此插件：  

- 打开 设置 > 第三方插件
- 确保安全模式为 **关闭**
- 点击浏览社区插件
- 搜索此插件
- 点击安装
- 安装完成后，关闭社区插件窗口并激活新安装的插件
### 从GitHub中安装
- 从 GitHub 仓库的发布部分下载最新版本
- 将插件文件夹从 zip 文件中解压到您的保险库的插件文件夹：`<vault>/.obsidian/plugins/`  
  注意：在某些电脑上，`.obsidian` 文件夹可能是隐藏文件夹。在 MacOS系统中，您应该能够按 Command+Shift+Dot 在 Finder 中显示该文件夹。
- 重新加载 Obsidian
- 如果收到关于安全模式的提示，您可以禁用安全模式并启用插件。否则去到 设置 -> 第三方插件，关闭安全模式并在列表中找到插件并启用。  

### Updates
您可以按照上述安装章节中所描述的相同步骤更新插件

# 警告
此插件不保证稳定性，错误可能会删除数据。 请确保您有自动备份。

# TTRPG plugins
如果您正在使用 Obsidian 来运行或者计划 TTRPG，可以尝试下我的其它插件，或许能帮到你：

[5e Statblocks](https://github.com/valentine195/obsidian-5e-statblocks/)  - 在笔记中创建 5e 风格的状态栏
[Dice Roller](https://github.com/valentine195/obsidian-dice-roller) - 在笔记中掷骰子和重新掷骰子
[Initiative Tracker](https://github.com/valentine195/obsidian-initiative-tracker)  - 在 Obsidian 中的 Initiative Tracker 视图


<a href="https://www.buymeacoffee.com/valentine195"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=valentine195&button_colour=e3e7ef&font_colour=262626&font_family=Inter&outline_colour=262626&coffee_colour=ff0000"></a>

[1]: 图像 地图的功能，是指在地图上增加要展示的图片 //TODO
[2]: Tile Server，地图服务器专业术语，可以直接理解成地图服务器。  
[3]: OpenStreetMap，是一个开放源代码的免费地图项目。

## 注释
[覆盖层]:  
[标记]: 