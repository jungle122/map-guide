# 地图素材说明

- `huanglian-map.jpg`：团队修订绿色外沿后的高清黄连古村地图，8091 × 5669；画布尺寸未改变，百分比坐标继续有效。
- `huanglian-map-preview.webp`：2048 × 1435 的普通模式预览图。仅在瓦片不可用或主动使用 `?map=legacy` 时加载，地图放大到 135% 后再加载高清原图。
- `huanglian-map-placeholder.webp`：1024 × 717 的瓦片模式占位图。首批可见瓦片绘制后即停止显示。
- `tiles/v3/`：由绿色外沿高清图生成的 512 × 512、重叠 1 像素 WebP DZI 静态瓦片金字塔，共 14 层。

收到新版正式地图时，应保留原始高清文件，并同步重新生成首屏预览图。

当前环境没有 libvips 时，也可以使用已安装 Pillow 的 Python 执行：

```powershell
python .\tools\generate-map-assets.py --version v4
```
