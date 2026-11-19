# 慢骑 SLOW RIDE · 专注海岸

卡通风 / 游戏风的网页专注工具：开始专注时，白鹅骑手「阿满」沿海岸骑行，海岸环境声淡入；暂停时它停下车、拿出小板凳、用翅膀托着茶杯喝一口。四页一体：专注海岸、我的规划、日程表、角色衣柜。

## 页面

| 文件 | 页面 | 主要内容 |
| --- | --- | --- |
| `focus.html` | 专注海岸 | 15 / 25 / 45 / 60 分钟计时、任务、开始 / 暂停 / 重置、全屏骑行（倒计时 + 本次 / 今日公里）、今日航程、本周足迹 |
| `plan.html` | 我的规划 | 本周三件事、本周航程柱状、便签、航行目标分段与「记录一段」 |
| `schedule.html` | 日程表 | 周视图 08:00–21:00，添加 / 完成 / 删除 / 切换周；窄屏自动变单日列表 |
| `character.html` | 角色衣柜 | 8 种羽色、8 顶帽子、7 种领巾、6 种车架、3 种车筐内容，随机一身 / 保存 / 骑行·喝茶预览 |

## 本地预览

纯静态页面，无需构建。由于用到 3D（`vendor/three.min.js`）与本地存储，建议起一个静态服务器：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000/focus.html
```

也可以直接双击 `focus.html`。首次点「开始骑行」后才会播放环境声（浏览器自动播放策略）。

## 技术与数据

- 原生 HTML / CSS / JS，一套设计变量 `tokens.css` + 组件样式 `app.css`，四页共用侧栏与顶栏。
- `scene.js`：Three.js 体素海岸场景（海水、灯塔、棕榈、栈道、云、海鸥、小船、螃蟹与骑车的白鹅），支持暂停喝茶、换装与取景。
- `audio.js`：Web Audio 实时合成的海浪、和声垫与风铃，无外部音频文件。
- 数据保存在浏览器 `localStorage`，键前缀 `slowride.v1.`（专注记录、规划、日程、角色搭配）。

## 目录

```
focus.html  plan.html  schedule.html  character.html
app.css  app.js  audio.js  scene.js  tokens.css
vendor/three.min.js
```

## 素材与版权

- 3D 场景基于参考页面 `海边骑车主页面.html`（作者体素海岸）改写，仅用于课程作业。
- 界面配色、图形、图标（内联 SVG）均为本项目自行绘制；未使用外部图片与音频素材。
- 第三方库：Three.js r159（MIT License，见 https://threejs.org/）。
