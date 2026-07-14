// 划词翻译 Content Script
let translationBox = null;
let isMouseDown = false;

// 检测是否是PDF环境
const isPDF = () => {
  return document.contentType === 'application/pdf' || 
         window.location.pathname.toLowerCase().endsWith('.pdf') ||
         document.querySelector('embed[type="application/pdf"]') !== null;
};

// PDF环境检测和准备
if (isPDF()) {
  console.log('🐆 Little Leopard: PDF detected, initializing...');
  // 等待PDF加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePDFSupport);
  } else {
    initializePDFSupport();
  }
}

function initializePDFSupport() {
  console.log('🐆 Little Leopard: PDF support initialized');
  // PDF环境下，我们需要监听整个嵌入层
  const pdfEmbed = document.querySelector('embed[type="application/pdf"]');
  if (pdfEmbed) {
    console.log('🐆 Found PDF embed element');
  }
}

// 标记功能状态
let highlightEnabled = false;
let currentMarkerType = 'highlight';
let currentMarkerColor = '#FFF176';
let highlights = [];

// 标记类型配置 - 专注学习场景
const markerTypes = {
  learned: { color: '#FFF176', emoji: '💡', name: '学到了' },
  question: { color: '#FF6B6B', emoji: '❓', name: '不理解' },
  strikethrough: { color: '#999999', emoji: '✂️', name: '跳过', style: 'strikethrough' }
};

// 初始化：从storage加载设置
chrome.storage.sync.get(['highlightEnabled', 'currentMarkerType', 'highlights'], (result) => {
  if (result.highlightEnabled !== undefined) {
    highlightEnabled = result.highlightEnabled;
  }
  if (result.currentMarkerType) {
    // 兼容旧的标记类型
    if (result.currentMarkerType === 'highlight' || result.currentMarkerType === 'important') {
      currentMarkerType = 'learned';
    } else if (markerTypes[result.currentMarkerType]) {
      currentMarkerType = result.currentMarkerType;
    } else {
      currentMarkerType = 'learned';
    }
    currentMarkerColor = markerTypes[currentMarkerType].color;
  }
  if (result.highlights && result.highlights[window.location.href]) {
    highlights = result.highlights[window.location.href];
    restoreHighlights();
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleHighlight') {
    highlightEnabled = request.enabled;
    showNotification(highlightEnabled ? '✨ 标记模式已启用' : '✨ 标记模式已关闭');
    sendResponse({ success: true });
  } else if (request.action === 'changeMarkerType') {
    currentMarkerType = request.markerType;
    currentMarkerColor = markerTypes[currentMarkerType].color;
    chrome.storage.sync.set({ currentMarkerType: currentMarkerType });
    showNotification(`${markerTypes[currentMarkerType].emoji} 切换到${currentMarkerType}模式`);
    sendResponse({ success: true });
  } else if (request.action === 'updateHighlightColor') {
    // 保留旧的颜色选择器功能（向后兼容）
    sendResponse({ success: true });
  } else if (request.action === 'clearHighlights') {
    clearAllHighlights();
    sendResponse({ success: true });
  }
  return true;
});

// 创建翻译结果显示框
function createTranslationBox() {
  if (translationBox) {
    return translationBox;
  }

  translationBox = document.createElement('div');
  translationBox.id = 'word-translator-box';
  translationBox.className = 'word-translator-box';
  translationBox.style.display = 'none';
  
  translationBox.innerHTML = `
    <div class="translator-header" style="cursor: move;">
      <span class="translator-title">🐆 Little Leopard</span>
      <button class="translator-close" title="Close (ESC)">×</button>
    </div>
    <div class="translator-content">
      <div class="translator-loading">翻译中...</div>
    </div>
  `;

  document.body.appendChild(translationBox);

  // 关闭按钮事件
  translationBox.querySelector('.translator-close').addEventListener('click', hideTranslationBox);
  
  // 添加拖动功能
  makeDraggable(translationBox);

  return translationBox;
}

// 使翻译框可拖动
function makeDraggable(element) {
  const header = element.querySelector('.translator-header');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  
  header.addEventListener('mousedown', (e) => {
    // 如果点击的是关闭按钮，不触发拖动
    if (e.target.classList.contains('translator-close')) {
      return;
    }
    
    isDragging = true;
    initialX = e.clientX - element.offsetLeft;
    initialY = e.clientY - element.offsetTop;
    
    header.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      // 限制在视窗内
      const maxX = window.innerWidth - element.offsetWidth;
      const maxY = window.innerHeight - element.offsetHeight;
      
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));
      
      element.style.left = currentX + 'px';
      element.style.top = currentY + 'px';
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      header.style.cursor = 'move';
    }
  });
}

// 显示翻译框
function showTranslationBox(x, y, text) {
  const box = createTranslationBox();
  const content = box.querySelector('.translator-content');
  
  // 显示加载状态
  content.innerHTML = '<div class="translator-loading">翻译中...</div>';
  
  // 如果翻译框已经显示，保持当前位置，只更新内容
  if (box.style.display === 'block') {
    // 翻译框已打开，只翻译新内容，不移动位置
    translateText(text);
    return;
  }
  
  // 首次打开时，计算位置（使用fixed定位，相对于视窗）
  const boxWidth = 340;
  const boxHeight = 250;
  
  // 转换为相对于视窗的坐标
  let left = x;
  let top = y - window.scrollY + 10;
  
  // 防止超出屏幕右边和下边
  if (left + boxWidth > window.innerWidth) {
    left = window.innerWidth - boxWidth - 20;
  }
  
  if (top + boxHeight > window.innerHeight) {
    top = (y - window.scrollY) - boxHeight - 10;
  }
  
  // 确保不超出左边界和上边界
  if (left < 10) left = 10;
  if (top < 10) top = 10;
  
  box.style.left = left + 'px';
  box.style.top = top + 'px';
  box.style.display = 'block';
  
  // 发送翻译请求
  translateText(text);
}

// 隐藏翻译框
function hideTranslationBox() {
  if (translationBox) {
    translationBox.style.display = 'none';
  }
}

// 翻译文本
async function translateText(text) {
  const box = createTranslationBox();
  const content = box.querySelector('.translator-content');
  
  try {
    // 检测语言（简单判断：包含中文字符则视为中文）
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    const sourceLang = isChinese ? 'zh-CN' : 'auto';
    const targetLang = isChinese ? 'en' : 'zh-CN';
    
    // 智能检测翻译模式
    let mode = 'general';
    
    // 检测D2L上下文
    if (typeof d2lDetector !== 'undefined' && 
        d2lDetector.isD2LContent(text, window.location.href)) {
      mode = 'd2l';
      console.log('🐆 D2L context detected, using D2L mode');
    } else if (window.location.hostname.includes('d2l.ai') || 
               window.location.hostname.includes('zh.d2l.ai') || 
               window.location.hostname.includes('en.d2l.ai') ||
               document.title.toLowerCase().includes('dive into deep learning') ||
               document.title.toLowerCase().includes('动手学深度学习')) {
      mode = 'd2l';
      console.log('🐆 D2L website detected, using D2L mode');
    }
    
    // 检测其他专业领域
    if (mode === 'general') {
      if (/arxiv\.org|paper|journal|conference/i.test(window.location.href) ||
          /abstract|introduction|methodology|experiment|conclusion/i.test(document.title)) {
        mode = 'academic';
        console.log('🐆 Academic context detected, using academic mode');
      } else if (/github\.com|stackoverflow|documentation|api/i.test(window.location.href)) {
        mode = 'technical';
        console.log('🐆 Technical context detected, using technical mode');
      }
    }

    // 发送消息到 background script 进行翻译
    const response = await chrome.runtime.sendMessage({
      action: 'translate',
      text: text,
      sourceLang: sourceLang,
      targetLang: targetLang,
      mode: mode
    });
    
    if (response.success) {
      content.innerHTML = `
        <div class="translator-source">
          <div class="translator-label">
            Original:
            <button class="translator-speak-btn" data-text="${escapeHtml(text)}" data-lang="${sourceLang}" title="Read aloud">
              🔊
            </button>
          </div>
          <div class="translator-text">${escapeHtml(text)}</div>
        </div>
        <div class="translator-result">
          <div class="translator-label">
            Translation:
            <button class="translator-speak-btn" data-text="${escapeHtml(response.translation)}" data-lang="${targetLang}" title="Read aloud">
              🔊
            </button>
          </div>
          <div class="translator-text">${escapeHtml(response.translation)}</div>
        </div>
      `;
      
      // 添加发音按钮事件监听
      content.querySelectorAll('.translator-speak-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const text = btn.getAttribute('data-text');
          const lang = btn.getAttribute('data-lang');
          speakText(text, lang);
        });
      });
    } else {
      content.innerHTML = `
        <div class="translator-error">
          翻译失败：${escapeHtml(response.error || '未知错误')}
        </div>
      `;
    }
  } catch (error) {
    const message = isExtensionContextInvalidated(error)
      ? '扩展刚刚重新加载，请刷新当前网页后再翻译。'
      : `翻译出错：${error.message}`;
    content.innerHTML = `
      <div class="translator-error">
        ${escapeHtml(message)}
      </div>
    `;
  }
}

function isExtensionContextInvalidated(error) {
  return /Extension context invalidated/i.test(error?.message || '');
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 文本转语音功能
let currentSpeech = null;

function speakText(text, lang) {
  // 如果正在播放，先停止
  if (currentSpeech) {
    window.speechSynthesis.cancel();
  }

  // 检查浏览器是否支持语音合成
  if (!window.speechSynthesis) {
    alert('您的浏览器不支持语音功能');
    return;
  }

  // 创建语音实例
  currentSpeech = new SpeechSynthesisUtterance(text);
  
  // 设置语言
  if (lang === 'zh-CN') {
    currentSpeech.lang = 'zh-CN';
  } else if (lang === 'en') {
    currentSpeech.lang = 'en-US';
  } else {
    currentSpeech.lang = 'en-US'; // 默认英语
  }
  
  // 设置语音参数
  currentSpeech.rate = 0.9;  // 语速 (0.1 - 10)
  currentSpeech.pitch = 1;   // 音调 (0 - 2)
  currentSpeech.volume = 1;  // 音量 (0 - 1)
  
  // 播放结束后清空
  currentSpeech.onend = () => {
    currentSpeech = null;
  };
  
  // 播放出错处理
  currentSpeech.onerror = (event) => {
    console.error('语音播放出错:', event);
    currentSpeech = null;
  };
  
  // 开始播放
  window.speechSynthesis.speak(currentSpeech);
}

// 标记功能
function highlightSelection(markerType = null) {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) return;
  
  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();
  
  // 使用指定类型或当前类型
  const type = markerType || currentMarkerType;
  const color = markerTypes[type].color;
  const emoji = markerTypes[type].emoji;
  
  if (!selectedText || selectedText.length === 0) return;
  
  // 创建标记span
  const highlightSpan = document.createElement('span');
  highlightSpan.className = `xiaobao-highlight marker-${type}`;
  
  // 根据类型应用不同样式
  if (type === 'strikethrough') {
    highlightSpan.style.textDecoration = 'line-through';
    highlightSpan.style.textDecorationColor = '#FF6B6B';
    highlightSpan.style.textDecorationThickness = '2px';
    highlightSpan.style.opacity = '0.6';
    highlightSpan.style.backgroundColor = 'rgba(153, 153, 153, 0.1)';
  } else {
    highlightSpan.style.backgroundColor = color;
  }
  
  highlightSpan.setAttribute('data-highlight-id', Date.now().toString());
  highlightSpan.setAttribute('data-marker-type', type);
  
  try {
    range.surroundContents(highlightSpan);
    
    const timestamp = Date.now();
    
    // 保存标记信息到本地highlights
    saveHighlight({
      id: highlightSpan.getAttribute('data-highlight-id'),
      text: selectedText,
      type: type,
      color: color,
      xpath: getXPath(highlightSpan),
      url: window.location.href,
      timestamp: timestamp
    });
    
    // 同时保存到全局markers（通过storage）
    saveToGlobalMarkers(selectedText, type, window.location.href, timestamp);
    
    // 添加删除事件监听
    highlightSpan.addEventListener('click', handleHighlightClick);
    
    // 清除选择
    selection.removeAllRanges();
    
    const notificationText = markerTypes[type].name + '标记';
    showNotification(`${emoji} ${notificationText}`);
  } catch (error) {
    console.log('Cannot highlight complex selection:', error);
    showNotification('⚠️ 无法标记此选择（可能包含复杂元素）');
  }
}

function handleHighlightClick(e) {
  // Alt+点击删除高亮
  if (e.altKey) {
    e.preventDefault();
    e.stopPropagation();
    removeHighlight(e.target);
  }
}

function removeHighlight(element) {
  if (!element.classList.contains('xiaobao-highlight')) return;
  
  const id = element.getAttribute('data-highlight-id');
  
  // 添加移除动画
  element.classList.add('removing');
  
  setTimeout(() => {
    // 用文本节点替换高亮span
    const parent = element.parentNode;
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
    
    // 从存储中删除
    deleteHighlight(id);
    
    showNotification('🗑️ 已移除高亮');
  }, 300);
}

function clearAllHighlights() {
  const highlightElements = document.querySelectorAll('.xiaobao-highlight');
  highlightElements.forEach(element => {
    const parent = element.parentNode;
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
  });
  
  // 清除本页面的highlights存储
  chrome.storage.sync.get(['highlights'], (result) => {
    const allHighlights = result.highlights || {};
    delete allHighlights[window.location.href];
    chrome.storage.sync.set({ highlights: allHighlights });
  });
  
  // 同时从全局markers中删除本页面的所有标记
  clearPageMarkersFromGlobal(window.location.href);
  
  highlights = [];
  showNotification('🗑️ 已清除所有高亮');
}

// 从全局markers中清除当前页面的所有标记
function clearPageMarkersFromGlobal(url) {
  chrome.storage.sync.get(['markers'], (result) => {
    let markers = result.markers || [];
    
    // 过滤掉当前URL的所有标记
    markers = markers.filter(m => m.url !== url);
    
    chrome.storage.sync.set({ markers: markers }, () => {
      console.log('📚 Page markers cleared from global list');
    });
  });
}

function saveHighlight(highlightData) {
  highlights.push(highlightData);
  
  chrome.storage.sync.get(['highlights'], (result) => {
    const allHighlights = result.highlights || {};
    allHighlights[window.location.href] = highlights;
    chrome.storage.sync.set({ highlights: allHighlights });
  });
}

// 保存到全局markers列表
function saveToGlobalMarkers(text, type, url, timestamp) {
  chrome.storage.sync.get(['markers'], (result) => {
    const markers = result.markers || [];
    
    const marker = {
      id: `marker_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      type: type,
      color: markerTypes[type].color,
      note: '',
      url: url,
      timestamp: timestamp,
      dateString: new Date(timestamp).toLocaleString()
    };
    
    markers.unshift(marker);
    
    chrome.storage.sync.set({ markers: markers }, () => {
      console.log('📚 Marker saved to global list:', marker);
    });
  });
}

function deleteHighlight(id) {
  // 找到要删除的highlight，获取其文本用于删除marker
  const highlightToDelete = highlights.find(h => h.id === id);
  
  highlights = highlights.filter(h => h.id !== id);
  
  chrome.storage.sync.get(['highlights'], (result) => {
    const allHighlights = result.highlights || {};
    allHighlights[window.location.href] = highlights;
    chrome.storage.sync.set({ highlights: allHighlights });
  });
  
  // 同时从全局markers中删除
  if (highlightToDelete) {
    deleteFromGlobalMarkers(highlightToDelete.text, highlightToDelete.timestamp);
  }
}

// 从全局markers列表中删除
function deleteFromGlobalMarkers(text, timestamp) {
  chrome.storage.sync.get(['markers'], (result) => {
    let markers = result.markers || [];
    
    // 通过文本和时间戳匹配（因为ID可能不同）
    markers = markers.filter(m => {
      // 如果文本和时间戳都匹配，则删除
      return !(m.text === text && Math.abs(m.timestamp - timestamp) < 1000);
    });
    
    chrome.storage.sync.set({ markers: markers }, () => {
      console.log('📚 Marker deleted from global list');
    });
  });
}

function restoreHighlights() {
  // 简单的恢复机制：基于XPath查找元素
  highlights.forEach(highlightData => {
    try {
      const element = getElementByXPath(highlightData.xpath);
      if (element && element.textContent.includes(highlightData.text)) {
        // 高亮已存在的文本
        highlightTextInElement(element, highlightData.text, highlightData.color, highlightData.id);
      }
    } catch (error) {
      console.log('Could not restore highlight:', error);
    }
  });
}

function highlightTextInElement(element, text, color, id) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodesToProcess = [];
  
  while (walker.nextNode()) {
    if (walker.currentNode.textContent.includes(text)) {
      nodesToProcess.push(walker.currentNode);
    }
  }
  
  nodesToProcess.forEach(node => {
    const index = node.textContent.indexOf(text);
    if (index !== -1) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + text.length);
      
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'xiaobao-highlight';
      highlightSpan.style.backgroundColor = color;
      highlightSpan.setAttribute('data-highlight-id', id);
      
      try {
        range.surroundContents(highlightSpan);
        highlightSpan.addEventListener('click', handleHighlightClick);
      } catch (error) {
        console.log('Could not apply highlight:', error);
      }
    }
  });
}

function getXPath(element) {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  const parts = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = element.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = element.nodeName.toLowerCase();
    const pathIndex = index ? `[${index + 1}]` : '';
    parts.unshift(`${tagName}${pathIndex}`);
    
    element = element.parentNode;
  }
  
  return parts.length ? `/${parts.join('/')}` : '';
}

function getElementByXPath(xpath) {
  return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function showNotification(message) {
  // 移除现有通知
  const existing = document.querySelector('.highlight-notification');
  if (existing) {
    existing.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = 'highlight-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// 监听文本选择
document.addEventListener('mouseup', (e) => {
  // 延迟执行，确保选择已完成
  setTimeout(() => {
    const selectedText = window.getSelection().toString().trim();
    
    // 如果点击在翻译框内，不处理
    if (translationBox && translationBox.contains(e.target)) {
      return;
    }
    
    // 如果点击在高亮元素上且按了Alt键，不显示翻译框
    if (e.target.classList.contains('xiaobao-highlight') && e.altKey) {
      return;
    }
    
    if (selectedText.length > 0 && selectedText.length < 1000) {
      // 显示翻译框（除非在高亮模式下按了Ctrl+H）
      if (!highlightEnabled || !e.ctrlKey) {
        showTranslationBox(e.pageX, e.pageY, selectedText);
      }
    }
    // 注释：不再自动关闭翻译框，让用户手动控制
  }, 10);
});

// 点击其他地方不再自动隐藏翻译框（改为固定显示模式）
// 用户可以通过点击关闭按钮来关闭
document.addEventListener('mousedown', (e) => {
  // 只处理翻译框内的点击事件，不关闭翻译框
  if (translationBox && translationBox.contains(e.target)) {
    // 翻译框内的操作
  }
});

// 滚动时不再自动隐藏翻译框（固定显示模式）
// 如果需要在滚动时自动隐藏，可以取消下面的注释
// document.addEventListener('scroll', () => {
//   hideTranslationBox();
// }, true);

// 监听快捷键
document.addEventListener('keydown', (e) => {
  // Ctrl+L 直接标记为 Learned（自动启用标记模式）
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault();
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      // 自动启用标记模式
      if (!highlightEnabled) {
        highlightEnabled = true;
        chrome.storage.sync.set({ highlightEnabled: true });
      }
      highlightSelection('learned');
    }
  }
  
  // Ctrl+Q 的处理：优先标记，如果没有选中文字才翻译
  if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      // 有选中文字时，直接标记为 Question（自动启用标记模式）
      e.preventDefault();
      if (!highlightEnabled) {
        highlightEnabled = true;
        chrome.storage.sync.set({ highlightEnabled: true });
      }
      highlightSelection('question');
    } else {
      // 没有选中文字时，显示翻译框（原有功能）
      e.preventDefault();
      if (translationBox && translationBox.style.display === 'none') {
        const range = window.getSelection().getRangeAt(0);
        showTranslationBox(range);
      } else {
        hideTranslationBox();
      }
    }
  }
  
  // Ctrl+D 直接标记为 Delete（自动启用标记模式）
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      // 自动启用标记模式
      if (!highlightEnabled) {
        highlightEnabled = true;
        chrome.storage.sync.set({ highlightEnabled: true });
      }
      highlightSelection('strikethrough');
    }
  }
  
  // ESC 键隐藏翻译框
  if (e.key === 'Escape') {
    hideTranslationBox();
  }
});

