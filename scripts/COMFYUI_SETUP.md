# ComfyUI 批量生成图片 · 5 分钟搭好

一口气把 80 张图（44 张背景 + 36 张立绘）全跑出来。

## 你需要

- ComfyUI 已安装并能跑通一次手动生成
- 一个 SDXL / Flux / Pony 系列的 checkpoint
- Python 3.9+（一般 ComfyUI 装的时候自带）

## 流程总览

```
1. 启动 ComfyUI（带 --listen）
2. 在 ComfyUI 里搭好一个最普通的 txt2img 工作流，跑一次确认能出图
3. 导出该工作流为「API 格式 JSON」
4. 跑我们的 Python 脚本，自动读 CSV 清单逐张生成
```

## Step 1 — 启动 ComfyUI

```bash
cd <你的 ComfyUI 安装目录>
python main.py --listen 127.0.0.1 --port 8188
```

浏览器打开 <http://127.0.0.1:8188> 应该能看见 ComfyUI 的界面。

## Step 2 — 搭一个基础 txt2img 工作流

ComfyUI 默认就是这个。**节点连法**最少要包含：

```
Load Checkpoint  ─►  CLIPTextEncode (正向 prompt)  ─►┐
                 ─►  CLIPTextEncode (负向 prompt)  ─►├─► KSampler ─► VAE Decode ─► SaveImage
EmptyLatentImage ───────────────────────────────────►┘
```

**节点设置建议**

| 节点 | 关键参数 |
|---|---|
| Load Checkpoint | 选你的模型（SDXL Base/Refiner 或 Flux Dev 都行；唐风建议 SDXL + Tang style LoRA，或 Flux + style ref） |
| EmptyLatentImage | width / height 随便填（脚本会覆盖） |
| KSampler | steps 20-30，cfg 6-8，sampler `euler` 或 `dpmpp_2m`，scheduler `karras` |
| SaveImage | filename_prefix 随便填（脚本会覆盖） |

**画风建议加一个 style reference**（IPAdapter / Style Model）让 75 张图调子统一：

- SDXL：用 IPAdapter Plus 节点，喂一张参考图（找一张你喜欢的唐画当 style ref）
- Flux：用 ReduxStyleModel 节点喂参考图

跑一张测试图，确认能正常出图。

## Step 3 — 导出工作流为 API 格式

在 ComfyUI 界面：

1. 右上角设置图标 ⚙️ → 勾上 **"Enable Dev mode Options"**
2. 主菜单出现 **"Save (API Format)"**
3. 点它，存为 `scripts/comfy_workflow.json`（放到这个项目的 `scripts/` 目录下）

> ⚠️ 一定要是 **API Format**，不是普通的 Save。普通 Save 出来的是给 UI 用的，脚本不认。

## Step 4 — 跑批

```bash
cd <这个项目根目录>
python scripts/run_comfyui_batch.py
```

默认行为：
- 读 `scripts/assets_manifest.csv`（已经填好 75 行）
- 逐行喂给 ComfyUI
- 出图后自动放到 `public/assets/...` 对应路径

**常用参数**

```bash
# 先只跑 NPC 立绘（36 张），看风格满意再继续
python scripts/run_comfyui_batch.py --only npc

# 只跑 736 那一个事件的图（4 张背景）
python scripts/run_comfyui_batch.py --filter 736_qizhao

# 已经存在的不重跑（断点续传）
python scripts/run_comfyui_batch.py --skip-existing

# 换一个 base seed（同样的 prompt 出不同结果）
python scripts/run_comfyui_batch.py --seed 999

# 自定义风格 suffix（脚本会自动拼到每个 prompt 后）
python scripts/run_comfyui_batch.py --style "Tang Dynasty ink wash, watercolor, cinematic"

# 跑远程 ComfyUI
python scripts/run_comfyui_batch.py --host 192.168.1.50:8188
```

## 推荐生成顺序

1. **先跑 5 张 NPC 测试**：`--only npc --filter merchant`（4 张商人）
   - 看脸、衣料、构图是否一致
   - 不满意就调 `--style` 或换 style reference 重跑
2. **风格定下来 → 跑全部 NPC**：`--only npc`
3. **再跑全部背景**：`--only bg`

## 用 ChatGPT / Claude 辅助调 prompt

如果某一组图风格不对（比如李白看起来太「现代」），直接把这一行的 prompt 拷出来：

> 帮我把这段 prompt 改得更像唐代水墨画风：「唐代男子四十余岁，半身立绘……」

让 ChatGPT 改完，回写到 `assets_manifest.csv` 对应行，再跑：

```bash
python scripts/run_comfyui_batch.py --filter libai
```

只跑这一张。

## 常见坑

| 现象 | 解决 |
|---|---|
| `Expected ≥2 CLIPTextEncode nodes` | 你的 workflow 必须有正向 + 负向两个 CLIPTextEncode 节点（最普通的 txt2img 默认就有） |
| 脚本卡住不动 | ComfyUI 后台没启动 / 端口不对 / 模型还在加载（第一张会慢） |
| 透明背景的立绘不透明 | SDXL 默认是不透明的。要么：(a) 喂一个 transparent-bg LoRA； (b) 生成后用 rembg 自动抠图（见下） |
| 中文 prompt 效果差 | 改用英文 prompt：把 CSV 的 prompt 列换成英文，或者用大语言模型把中文翻成英文再喂 |

## 立绘自动抠图（透明背景）

如果你的模型不直接出透明背景，跑完之后再统一抠一遍：

```bash
pip install rembg
cd public/assets/characters/npcs
for f in *.png; do
  rembg i "$f" "$f"  # 原地抠图
done
```

## 文件位置

```
scripts/
├── assets_manifest.csv         # 75 行清单（type / output_path / prompt / w / h / transparent）
├── run_comfyui_batch.py        # 批量脚本
├── comfy_workflow.json         # 你导出的工作流（你自己生成）
└── COMFYUI_SETUP.md            # 你正在看的这个文档
```

跑完后 `public/assets/...` 下应该出现 75 张图，直接 `npm run dev` 进游戏看效果。
