// Always on Top Helper
// 此脚本帮助保持窗口在最上层

// 注意：Chrome扩展的popup窗口类型默认就有一定的置顶特性
// 但为了更好的用户体验，我们添加一些辅助机制

// 1. 监听窗口失焦事件
let isUserMinimized = false;

window.addEventListener('blur', () => {
  // 当窗口失去焦点时，尝试重新获得焦点
  // 但不要在用户最小化窗口时这样做
  if (!isUserMinimized && document.visibilityState === 'visible') {
    setTimeout(() => {
      if (chrome.windows && chrome.windows.getCurrent) {
        chrome.windows.getCurrent((win) => {
          if (win && win.id && win.state !== 'minimized') {
            chrome.windows.update(win.id, { focused: true });
          }
        });
      }
    }, 100);
  }
});

// 2. 监听窗口大小变化（检测最小化）
window.addEventListener('resize', () => {
  if (document.hidden || document.visibilityState === 'hidden') {
    isUserMinimized = true;
  } else {
    isUserMinimized = false;
  }
});

// 3. 提供手动置顶功能
window.bringToFront = () => {
  if (chrome.windows && chrome.windows.getCurrent) {
    chrome.windows.getCurrent((win) => {
      if (win && win.id) {
        chrome.windows.update(win.id, { 
          focused: true,
          drawAttention: true
        });
      }
    });
  }
};

// 4. 添加全局快捷键提示
document.addEventListener('DOMContentLoaded', () => {
  console.log('🐆 Little Leopard Translator - Always on Top Mode');
  console.log('💡 Tip: This window will try to stay on top of other windows');
  console.log('💡 Press Ctrl+W to close this window');
  console.log('💡 You can minimize it normally with the minimize button');
});

// 5. 防止意外关闭的提示
let hasUnsavedWork = false;

window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedWork) {
    e.preventDefault();
    e.returnValue = '';
    return '确定要关闭翻译窗口吗？';
  }
});

// 6. 监听输入框内容变化
document.addEventListener('DOMContentLoaded', () => {
  const inputText = document.getElementById('inputText');
  if (inputText) {
    inputText.addEventListener('input', () => {
      hasUnsavedWork = inputText.value.trim().length > 0;
    });
  }
});

