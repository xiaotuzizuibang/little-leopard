// Popup script
let lastTranslation = null;
let lastTranslationLang = null;

document.addEventListener('DOMContentLoaded', () => {
  const inputText = document.getElementById('inputText');
  const translateBtn = document.getElementById('translateBtn');
  const btnText = document.getElementById('btnText');
  const resultDiv = document.getElementById('result');
  const speakBtn = document.getElementById('speakBtn');
  const speakOriginalBtn = document.getElementById('speakOriginalBtn');
  
  // 标记功能控件
  const highlightToggle = document.getElementById('highlightToggle');
  const clearAllMarkersBtn = document.getElementById('clearAllMarkersBtn');
  const markerTypeBtns = document.querySelectorAll('.marker-type-btn');
  
  // 新窗口按钮
  const openWindowBtn = document.getElementById('openWindowBtn');
  
  // 打开独立窗口（固定模式 - 始终置顶）
  if (openWindowBtn) {
    openWindowBtn.addEventListener('click', () => {
      chrome.windows.create({
        url: chrome.runtime.getURL('standalone.html'),
        type: 'popup',
        width: 460,
        height: 600,
        left: screen.width - 480,
        top: 100,
        focused: true,
        // 设置窗口始终置顶
        setSelfAsOpener: true
      }, (window) => {
        // 窗口创建后，设置为始终置顶
        if (window && window.id) {
          chrome.windows.update(window.id, { 
            focused: true,
            drawAttention: false,
            state: 'normal'
          });
        }
      });
    });
  }
  
  // 加载标记设置
  chrome.storage.sync.get(['highlightEnabled', 'currentMarkerType'], (result) => {
    if (result.highlightEnabled !== undefined) {
      highlightToggle.checked = result.highlightEnabled;
    }
    if (result.currentMarkerType) {
      // 激活对应的标记类型按钮
      markerTypeBtns.forEach(btn => {
        if (btn.dataset.type === result.currentMarkerType) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  });
  
  // 标记类型选择
  markerTypeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      // 更新UI
      markerTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const markerType = btn.dataset.type;
      
      // 保存到storage
      chrome.storage.sync.set({ currentMarkerType: markerType });
      
      // 通知content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, {
        action: 'changeMarkerType',
        markerType: markerType
      });
    });
  });
  
  // 标记模式开关
  highlightToggle.addEventListener('change', async () => {
    const enabled = highlightToggle.checked;
    chrome.storage.sync.set({ highlightEnabled: enabled });
    
    // 添加激活动画
    const toggleContainer = document.querySelector('.toggle-container');
    toggleContainer.classList.add('activating');
    setTimeout(() => {
      toggleContainer.classList.remove('activating');
    }, 600);
    
    // 通知当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, {
      action: 'toggleHighlight',
      enabled: enabled
    });
  });
  
  // 清除所有标记
  if (clearAllMarkersBtn) {
    clearAllMarkersBtn.addEventListener('click', async () => {
      if (confirm('确定要清除所有保存的标记吗？')) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, {
          action: 'clearHighlights'
        });
      }
    });
  }

  translateBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    
    if (!text) {
      showResult('请输入要翻译的文字', 'error');
      return;
    }

    if (text.length > 1000) {
      showResult('文字过长，请输入少于1000字的内容', 'error');
      return;
    }

    // 显示加载状态（添加loading类触发动画）
    translateBtn.disabled = true;
    translateBtn.classList.add('loading');
    btnText.textContent = '翻译中...';
    showResult('正在翻译...', 'loading');

    try {
      // 检测语言
      const isChinese = /[\u4e00-\u9fa5]/.test(text);
      const sourceLang = isChinese ? 'zh-CN' : 'auto';
      const targetLang = isChinese ? 'en' : 'zh-CN';

      // 获取翻译模式
      const translateMode = document.querySelector('input[name="translateMode"]:checked').value;

      // 发送翻译请求
      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        text: text,
        sourceLang: sourceLang,
        targetLang: targetLang,
        mode: translateMode
      });

      if (response.success) {
        showResult(response.translation, 'success');
        // 保存翻译结果用于发音
        lastTranslation = response.translation;
        lastTranslationLang = targetLang;
        speakBtn.style.display = 'block';
        
        // 显示成功提示动画，包含提供商信息
        const cacheInfo = response.fromCache ? ' ⚡' : '';
        const providerInfo = response.provider ? ` (${response.provider})` : '';
        showSuccessToast(`Done!${cacheInfo}${providerInfo}`);
      } else {
        showResult('Translation failed: ' + response.error, 'error');
        speakBtn.style.display = 'none';
      }
    } catch (error) {
      showResult('翻译出错: ' + error.message, 'error');
      speakBtn.style.display = 'none';
    } finally {
      translateBtn.disabled = false;
      translateBtn.classList.remove('loading');
      btnText.textContent = 'Translate';
    }
  });

  // 回车键翻译
  inputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      translateBtn.click();
    }
  });

  // 翻译结果发音按钮
  speakBtn.addEventListener('click', () => {
    if (lastTranslation) {
      speakText(lastTranslation, lastTranslationLang, speakBtn);
    }
  });
  
  // 原文发音按钮
  if (speakOriginalBtn) {
    speakOriginalBtn.addEventListener('click', () => {
      const text = inputText.value.trim();
      if (!text) {
        showNotificationToast('⚠️ Please enter text first');
        return;
      }
      
      // 检测语言
      const isChinese = /[\u4e00-\u9fa5]/.test(text);
      const lang = isChinese ? 'zh-CN' : 'en-US';
      
      speakText(text, lang, speakOriginalBtn);
    });
  }

  function showResult(text, type) {
    resultDiv.textContent = text;
    resultDiv.className = 'result show ' + type;
    
    if (type === 'loading') {
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      resultDiv.textContent = '';
      resultDiv.appendChild(spinner);
      resultDiv.appendChild(document.createTextNode(text));
    }
  }
  
  // 显示成功提示
  function showSuccessToast(message) {
    // 移除现有的提示
    const existing = document.querySelector('.success-toast');
    if (existing) {
      existing.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 2秒后淡出
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 2000);
  }

  // 文本转语音功能
  function speakText(text, lang, button) {
    // 检查浏览器是否支持语音合成
    if (!window.speechSynthesis) {
      showNotificationToast('⚠️ Your browser does not support speech synthesis');
      return;
    }

    // 停止当前播放
    window.speechSynthesis.cancel();

    // 创建语音实例
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 设置语言
    if (lang === 'zh-CN') {
      utterance.lang = 'zh-CN';
    } else if (lang === 'en' || lang === 'en-US') {
      utterance.lang = 'en-US';
    } else {
      utterance.lang = 'en-US';
    }
    
    // 设置语音参数
    utterance.rate = 0.9;  // 语速
    utterance.pitch = 1;   // 音调
    utterance.volume = 1;  // 音量
    
    // 处理不同按钮的状态
    if (button) {
      const isOriginalBtn = button === speakOriginalBtn;
      
      if (isOriginalBtn) {
        button.disabled = true;
        button.classList.add('speaking');
      } else {
        button.disabled = true;
        button.textContent = '🔊 Playing...';
      }
      
      // 播放结束
      utterance.onend = () => {
        if (isOriginalBtn) {
          button.disabled = false;
          button.classList.remove('speaking');
        } else {
          button.disabled = false;
          button.textContent = '🔊 Read Translation';
        }
      };
      
      // 播放出错
      utterance.onerror = (event) => {
        console.error('语音播放出错:', event);
        if (isOriginalBtn) {
          button.disabled = false;
          button.classList.remove('speaking');
        } else {
          button.disabled = false;
          button.textContent = '🔊 Read Translation';
        }
        showNotificationToast('⚠️ Speech synthesis error');
      };
    }
    
    // 开始播放
    window.speechSynthesis.speak(utterance);
  }
  
  // 显示提示通知
  function showNotificationToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(145deg, #D4A017, #B8860B);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideDown 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
});


