/**
 * 浏览器状态迁移工具
 * 处理从旧的基于截图的浏览器状态到新的iframe模式的迁移
 */

// 定义默认的浏览器状态，避免循环依赖
const defaultBrowserState = {
  currentUrl: "https://github.com/All-Hands-AI/OpenHands",
  isLoading: false,
  error: undefined,
  history: ["https://github.com/All-Hands-AI/OpenHands"],
  historyIndex: 0,
  autoSwitchEnabled: true,
  downloadInProgress: false,
};

// 旧的浏览器状态接口（向后兼容）
interface LegacyBrowserState {
  url: string;
  screenshotSrc: string;
  // 可能存在的其他旧字段
  [key: string]: any;
}

// 新的浏览器状态接口
interface NewBrowserState {
  currentUrl: string;
  isLoading: boolean;
  error?: string;
  history: string[];
  historyIndex: number;
  autoSwitchEnabled: boolean;
  downloadInProgress: boolean;
}

/**
 * 检查是否为旧的浏览器状态
 */
export function isLegacyBrowserState(state: any): state is LegacyBrowserState {
  return (
    state &&
    typeof state === 'object' &&
    'screenshotSrc' in state &&
    !('currentUrl' in state)
  );
}

/**
 * 将旧的浏览器状态迁移到新状态
 */
export function migrateBrowserState(legacyState: LegacyBrowserState): NewBrowserState {
  const url = legacyState.url || defaultBrowserState.currentUrl;
  
  return {
    currentUrl: url,
    isLoading: false,
    error: undefined,
    history: url ? [url] : defaultBrowserState.history,
    historyIndex: url ? 0 : defaultBrowserState.historyIndex,
    autoSwitchEnabled: defaultBrowserState.autoSwitchEnabled,
    downloadInProgress: defaultBrowserState.downloadInProgress,
  };
}

/**
 * 从localStorage中迁移旧的浏览器状态
 */
export function migrateStoredBrowserState(): NewBrowserState | null {
  try {
    const storedState = localStorage.getItem('browserState');
    if (!storedState) return null;
    
    const parsedState = JSON.parse(storedState);
    
    if (isLegacyBrowserState(parsedState)) {
      const migratedState = migrateBrowserState(parsedState);
      
      // 保存迁移后的状态
      localStorage.setItem('browserState', JSON.stringify(migratedState));
      
      // 清理旧的状态键（如果存在）
      localStorage.removeItem('browser'); // 旧的键名
      
      return migratedState;
    }
    
    return parsedState;
  } catch (error) {
    console.warn('Failed to migrate browser state from localStorage:', error);
    return null;
  }
}

/**
 * 验证状态是否为有效的新浏览器状态
 */
export function isValidNewBrowserState(state: any): state is NewBrowserState {
  return (
    state &&
    typeof state === 'object' &&
    typeof state.currentUrl === 'string' &&
    typeof state.isLoading === 'boolean' &&
    Array.isArray(state.history) &&
    typeof state.historyIndex === 'number' &&
    typeof state.autoSwitchEnabled === 'boolean' &&
    typeof state.downloadInProgress === 'boolean'
  );
}

/**
 * 获取迁移后的浏览器状态，如果需要的话进行迁移
 */
export function getOrMigrateBrowserState(): NewBrowserState {
  const migratedState = migrateStoredBrowserState();
  
  if (migratedState && isValidNewBrowserState(migratedState)) {
    return migratedState;
  }
  
  return defaultBrowserState;
}

/**
 * 清理旧的浏览器相关localStorage数据
 */
export function cleanupLegacyBrowserData() {
  const legacyKeys = [
    'browser', 
    'browserScreenshot', 
    'browserUrl',
    'browserState_old',
    'browser-slice-screenshot'  // 可能的旧键名变体
  ];
  
  legacyKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`Cleaned up legacy browser data: ${key}`);
    }
  });
}

/**
 * 执行完整的浏览器状态迁移流程
 */
export function performBrowserStateMigration(): {
  migrated: boolean;
  state: NewBrowserState;
} {
  // 1. 尝试从localStorage迁移
  const migratedState = migrateStoredBrowserState();
  
  // 2. 清理旧数据
  cleanupLegacyBrowserData();
  
  // 3. 返回最终状态
  if (migratedState && isValidNewBrowserState(migratedState)) {
    return {
      migrated: true,
      state: migratedState,
    };
  }
  
  return {
    migrated: false,
    state: defaultBrowserState,
  };
}

// 用于调试的工具函数
export function getBrowserStateMigrationInfo() {
  const storedState = localStorage.getItem('browserState');
  const parsedState = storedState ? JSON.parse(storedState) : null;
  
  return {
    hasStoredState: !!storedState,
    isLegacy: parsedState ? isLegacyBrowserState(parsedState) : false,
    isValid: parsedState ? isValidNewBrowserState(parsedState) : false,
    currentState: parsedState,
  };
}