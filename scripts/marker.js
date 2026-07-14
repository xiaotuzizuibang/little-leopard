// Reading Marker System
// 阅读标记系统

class MarkerManager {
  constructor() {
    this.currentMarkerType = 'learned';
    this.currentMarkerColor = '#FFF176';
    this.markers = [];
    this.currentFilter = 'all';
    this.currentSearchTerm = '';
    this.init();
  }

  init() {
    console.log('📚 Marker system initialized');
    this.loadMarkers();
    this.setupEventListeners();
    this.setupMarkerItemListeners();
    this.updateMarkerCount();
  }

  setupEventListeners() {
    // Marker type selection
    document.querySelectorAll('.marker-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.marker-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMarkerType = btn.dataset.type;
        this.currentMarkerColor = btn.dataset.color;
        console.log(`📍 Switched to marker type: ${this.currentMarkerType}`);
      });
    });

    // View markers button
    document.getElementById('viewMarkersBtn')?.addEventListener('click', () => {
      this.showMarkerPanel();
    });

    // Close panel button
    document.getElementById('closeMarkerPanel')?.addEventListener('click', () => {
      this.hideMarkerPanel();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterMarkers(btn.dataset.filter);
      });
    });

    // Search input
    document.getElementById('markerSearchInput')?.addEventListener('input', (e) => {
      this.searchMarkers(e.target.value);
    });

    // Group by URL toggle
    document.getElementById('groupByUrlToggle')?.addEventListener('change', () => {
      this.renderMarkerList();
    });

    // Export button
    document.getElementById('exportMarkersBtn')?.addEventListener('click', () => {
      this.exportMarkersToMarkdown();
    });

    // Export JSON button
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
      this.exportMarkersToJSON();
    });

    // Import JSON button
    document.getElementById('importJsonBtn')?.addEventListener('click', () => {
      document.getElementById('importJsonFile')?.click();
    });

    // File input handler
    document.getElementById('importJsonFile')?.addEventListener('change', (e) => {
      this.importMarkersFromJSON(e.target.files[0]);
    });

    // Clear all button
    document.getElementById('clearAllMarkersBtn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all markers?')) {
        this.clearAllMarkers();
      }
    });

    // Open history page button
    document.getElementById('openHistoryBtn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    });
  }

  loadMarkers() {
    chrome.storage.sync.get(['markers'], (result) => {
      this.markers = result.markers || [];
      this.updateMarkerCount();
      console.log(`📚 Loaded ${this.markers.length} markers`, this.markers);
      
      // 如果面板已经打开，刷新显示
      const panel = document.getElementById('markerListPanel');
      if (panel && panel.style.display !== 'none') {
        this.renderMarkerList();
      }
    });
  }

  saveMarkers() {
    chrome.storage.sync.set({ markers: this.markers }, () => {
      this.updateMarkerCount();
      console.log(`📚 Saved ${this.markers.length} markers`);
    });
  }

  addMarker(text, type, note = '', url = '', timestamp = Date.now()) {
    const marker = {
      id: `marker_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      type: type || this.currentMarkerType,
      color: this.currentMarkerColor,
      note: note,
      url: url,
      timestamp: timestamp,
      dateString: new Date(timestamp).toLocaleString()
    };

    this.markers.unshift(marker);
    this.saveMarkers();
    this.showNotification(`${this.getTypeEmoji(type)} Marker added!`);
    return marker;
  }

  removeMarker(markerId) {
    this.markers = this.markers.filter(m => m.id !== markerId);
    this.saveMarkers();
    this.renderMarkerList();
    this.showNotification('🗑️ Marker removed');
  }

  clearAllMarkers() {
    this.markers = [];
    this.saveMarkers();
    this.renderMarkerList();
    this.showNotification('🗑️ All markers cleared');
  }

  updateMarkerCount() {
    const countEl = document.getElementById('markerCount');
    if (countEl) {
      countEl.textContent = this.markers.length;
    }
  }

  showMarkerPanel() {
    const panel = document.getElementById('markerListPanel');
    if (panel) {
      panel.style.display = 'flex';
      this.renderMarkerList();
    }
  }

  hideMarkerPanel() {
    const panel = document.getElementById('markerListPanel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  filterMarkers(filter) {
    this.currentFilter = filter;
    this.renderMarkerList();
  }

  setupMarkerItemListeners() {
    const container = document.getElementById('markerListContent');
    if (!container) return;

    // 使用事件委托处理所有按钮点击
    container.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;

      const action = button.dataset.action;
      const markerItem = button.closest('.marker-item');
      const markerId = markerItem?.dataset.markerId;
      const markerUrl = markerItem?.dataset.markerUrl;

      switch(action) {
        case 'open-link':
          if (markerUrl) {
            this.openMarkerLink(markerUrl);
          }
          break;
        case 'copy':
          if (markerId) {
            this.copyMarkerText(markerId);
          }
          break;
        case 'delete':
          if (markerId) {
            this.removeMarker(markerId);
          }
          break;
      }
    });
  }

  openMarkerLink(url) {
    if (!url) return;
    try {
      // 使用 chrome.tabs API 打开链接（更可靠）
      if (chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: url, active: true });
      } else {
        // 降级方案：使用 window.open
        window.open(url, '_blank');
      }
      this.showNotification('🔗 Opening page...');
    } catch (error) {
      console.error('Failed to open link:', error);
      this.showNotification('❌ Failed to open link');
    }
  }

  getHostname(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      return 'Unknown';
    }
  }

  groupMarkersByURL(markers) {
    const grouped = {};
    markers.forEach(marker => {
      const url = marker.url || 'Unknown Source';
      if (!grouped[url]) {
        grouped[url] = [];
      }
      grouped[url].push(marker);
    });
    return grouped;
  }

  searchMarkers(searchTerm) {
    this.currentSearchTerm = searchTerm.toLowerCase();
    this.renderMarkerList();
  }

  renderMarkerList(filter = null) {
    const container = document.getElementById('markerListContent');
    if (!container) return;

    const currentFilter = filter || this.currentFilter || 'all';
    
    // Apply type filter
    let filteredMarkers = currentFilter === 'all' 
      ? this.markers 
      : this.markers.filter(m => m.type === currentFilter);

    // Apply search filter
    if (this.currentSearchTerm) {
      filteredMarkers = filteredMarkers.filter(m => 
        m.text.toLowerCase().includes(this.currentSearchTerm) ||
        (m.note && m.note.toLowerCase().includes(this.currentSearchTerm)) ||
        (m.url && m.url.toLowerCase().includes(this.currentSearchTerm))
      );
    }

    if (filteredMarkers.length === 0) {
      container.innerHTML = `
        <div class="empty-markers">
          <div class="empty-markers-icon">📚</div>
          <p>${this.currentSearchTerm ? 'No matching markers found' : 'No markers yet'}</p>
          <p style="font-size: 12px; margin-top: 8px;">${this.currentSearchTerm ? 'Try a different search term' : 'Start marking important text while reading!'}</p>
        </div>
      `;
      return;
    }

    // Group by URL if enabled
    const groupByURL = document.getElementById('groupByUrlToggle')?.checked;
    
    if (groupByURL) {
      const grouped = this.groupMarkersByURL(filteredMarkers);
      container.innerHTML = Object.entries(grouped).map(([url, markers]) => {
        const hostname = url !== 'Unknown Source' ? this.getHostname(url) : 'Unknown Source';
        return `
          <div class="marker-group">
            <div class="marker-group-header">
              <span class="marker-group-title">
                🌐 ${hostname} (${markers.length})
              </span>
              ${url !== 'Unknown Source' ? `<button class="marker-group-link" data-action="open-link" data-url="${this.escapeHtml(url)}" title="Open page">🔗</button>` : ''}
            </div>
            ${markers.map(marker => this.renderMarkerItem(marker)).join('')}
          </div>
        `;
      }).join('');
      
      // 为分组链接添加事件监听
      container.querySelectorAll('.marker-group-link[data-action="open-link"]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const url = e.target.dataset.url;
          if (url) {
            this.openMarkerLink(url);
          }
        });
      });
    } else {
      container.innerHTML = filteredMarkers.map(marker => this.renderMarkerItem(marker)).join('');
    }
  }

  renderMarkerItem(marker) {
    return `
      <div class="marker-item type-${marker.type}" data-marker-id="${marker.id}" data-marker-url="${this.escapeHtml(marker.url || '')}">
        <div class="marker-header">
          <span class="marker-type-badge">${this.getTypeEmoji(marker.type)} ${this.getTypeName(marker.type)}</span>
          <div class="marker-actions">
            ${marker.url ? `<button class="marker-action-btn link-btn" data-action="open-link" title="Open page">🔗</button>` : ''}
            <button class="marker-action-btn copy" data-action="copy" title="Copy">
              📋
            </button>
            <button class="marker-action-btn delete" data-action="delete" title="Delete">
              🗑️
            </button>
          </div>
        </div>
        <div class="marker-text">${this.escapeHtml(marker.text)}</div>
        ${marker.note ? `<div class="marker-note">📝 ${this.escapeHtml(marker.note)}</div>` : ''}
        <div class="marker-meta">
          <span class="marker-date">${marker.dateString}</span>
          ${marker.url ? `<span class="marker-url" title="${this.escapeHtml(marker.url)}">${this.getHostname(marker.url)}</span>` : ''}
        </div>
      </div>
    `;
  }

  copyMarkerText(markerId) {
    const marker = this.markers.find(m => m.id === markerId);
    if (marker) {
      const text = marker.note ? `${marker.text}\n\n📝 ${marker.note}` : marker.text;
      navigator.clipboard.writeText(text).then(() => {
        this.showNotification('📋 Copied to clipboard!');
      });
    }
  }

  exportMarkersToMarkdown() {
    if (this.markers.length === 0) {
      alert('No markers to export!');
      return;
    }

    let markdown = `# 📚 Reading Markers\n\n`;
    markdown += `> Exported on ${new Date().toLocaleString()}\n`;
    markdown += `> Total markers: ${this.markers.length}\n\n`;
    markdown += `---\n\n`;

    // Group by type
    const grouped = {
      learned: [],
      question: [],
      strikethrough: []
    };

    this.markers.forEach(marker => {
      // 兼容旧的标记类型
      let type = marker.type;
      if (type === 'highlight' || type === 'important' || type === 'note') {
        type = 'learned';
      }
      if (grouped[type]) {
        grouped[type].push(marker);
      }
    });

    Object.keys(grouped).forEach(type => {
      const markers = grouped[type];
      if (markers.length > 0) {
        markdown += `## ${this.getTypeEmoji(type)} ${this.getTypeName(type)} (${markers.length})\n\n`;
        markers.forEach((marker, index) => {
          // 对删除标记添加删除线
          const text = type === 'strikethrough' ? `~~${marker.text}~~` : marker.text;
          markdown += `### ${index + 1}. ${text}\n\n`;
          if (marker.note) {
            markdown += `> 📝 **Note:** ${marker.note}\n\n`;
          }
          if (marker.url) {
            markdown += `**Source:** [${new URL(marker.url).hostname}](${marker.url})\n\n`;
          }
          markdown += `*Marked on: ${marker.dateString}*\n\n`;
          markdown += `---\n\n`;
        });
      }
    });

    // Download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reading-markers-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('💾 Markers exported!');
  }

  exportMarkersToJSON() {
    if (this.markers.length === 0) {
      alert('No markers to export!');
      return;
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalMarkers: this.markers.length,
      markers: this.markers
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markers-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('💾 Markers exported as JSON!');
  }

  async importMarkersFromJSON(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.markers || !Array.isArray(importData.markers)) {
        throw new Error('Invalid JSON format');
      }

      // Merge with existing markers (avoid duplicates by ID)
      const existingIds = new Set(this.markers.map(m => m.id));
      const newMarkers = importData.markers.filter(m => !existingIds.has(m.id));

      if (newMarkers.length === 0) {
        this.showNotification('ℹ️ No new markers to import');
        return;
      }

      this.markers = [...this.markers, ...newMarkers];
      this.saveMarkers();
      this.renderMarkerList();

      this.showNotification(`✅ Imported ${newMarkers.length} markers!`);
    } catch (error) {
      alert(`Failed to import markers: ${error.message}`);
    }
  }

  getTypeEmoji(type) {
    const emojis = {
      learned: '💡',
      question: '❓',
      strikethrough: '✂️',
      // 兼容旧数据
      highlight: '💡',
      important: '💡',
      note: '💡'
    };
    return emojis[type] || '💡';
  }

  getTypeName(type) {
    const names = {
      learned: 'Learned',
      question: 'Question',
      strikethrough: 'Delete',
      // 兼容旧数据
      highlight: 'Learned',
      important: 'Learned',
      note: 'Learned'
    };
    return names[type] || 'Learned';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }
}

// Initialize marker manager
let markerManager;
document.addEventListener('DOMContentLoaded', () => {
  markerManager = new MarkerManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkerManager;
}

