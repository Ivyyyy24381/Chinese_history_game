import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// 霞鹜文楷（开源楷体）——按需分包加载，只下载页面用到的字
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css'
import 'lxgw-wenkai-webfont/lxgwwenkai-bold.css'
import './styles/game.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
