/**
 * 应用初始化工具
 * 处理应用启动时的各种迁移和设置任务
 */

import { getBrowserStateMigrationInfo, performBrowserStateMigration } from "./browser-state-migration";

/**
 * 应用启动时的初始化任务
 */
export function initializeApp() {
  console.log('🚀 初始化OpenHands应用...');
  
  // 1. 检查并执行浏览器状态迁移
  initializeBrowserState();
  
  // 2. 其他初始化任务可以在这里添加
  // initializeUserSettings();
  // initializeConversationHistory();
  
  console.log('✅ OpenHands应用初始化完成');
}

/**
 * 初始化浏览器状态，处理从旧版本的迁移
 */
function initializeBrowserState() {
  try {
    const migrationInfo = getBrowserStateMigrationInfo();
    
    if (migrationInfo.hasStoredState) {
      if (migrationInfo.isLegacy) {
        console.log('📦 检测到旧版浏览器状态，开始迁移...');
        
        const migrationResult = performBrowserStateMigration();
        
        if (migrationResult.migrated) {
          console.log('✅ 浏览器状态迁移成功');
          console.log('📝 迁移详情:', {
            oldFormat: '基于截图的浏览器模式',
            newFormat: '基于iframe的真实浏览器模式',
            preservedUrl: migrationResult.state.currentUrl,
          });
        } else {
          console.warn('⚠️ 浏览器状态迁移失败，使用默认设置');
        }
      } else if (migrationInfo.isValid) {
        console.log('✅ 浏览器状态已是最新格式');
      } else {
        console.warn('⚠️ 浏览器状态格式无效，将重置为默认设置');
        performBrowserStateMigration(); // 这会清理并重置
      }
    } else {
      console.log('🆕 首次启动，使用默认浏览器设置');
    }
  } catch (error) {
    console.error('❌ 浏览器状态初始化失败:', error);
    // 发生错误时，执行迁移以确保有一个有效的状态
    performBrowserStateMigration();
  }
}

/**
 * 检查应用版本兼容性
 */
export function checkAppCompatibility(): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // 检查localStorage可用性
  try {
    const testKey = '__compatibility_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
  } catch (error) {
    issues.push('LocalStorage不可用');
    recommendations.push('请启用浏览器的本地存储功能');
  }

  // 检查现代浏览器API
  if (!window.fetch) {
    issues.push('Fetch API不支持');
    recommendations.push('请使用现代浏览器版本');
  }

  if (!window.WebSocket) {
    issues.push('WebSocket不支持');
    recommendations.push('请升级浏览器以支持WebSocket');
  }

  // 检查iframe支持
  const iframe = document.createElement('iframe');
  if (!iframe.contentWindow) {
    issues.push('iframe功能受限');
    recommendations.push('请检查浏览器安全设置');
  }

  return {
    compatible: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * 显示兼容性警告（如果需要）
 */
export function showCompatibilityWarnings() {
  const compatibility = checkAppCompatibility();
  
  if (!compatibility.compatible) {
    console.group('⚠️ 浏览器兼容性警告');
    console.warn('检测到以下兼容性问题:');
    compatibility.issues.forEach(issue => console.warn(`• ${issue}`));
    console.warn('建议措施:');
    compatibility.recommendations.forEach(rec => console.warn(`• ${rec}`));
    console.groupEnd();
    
    // 可以选择显示用户友好的警告对话框
    // showUserCompatibilityDialog(compatibility);
  }
}

/**
 * 应用启动时执行的完整初始化流程
 */
export function fullAppInitialization() {
  console.group('🔧 OpenHands 初始化');
  
  // 1. 检查兼容性
  showCompatibilityWarnings();
  
  // 2. 执行迁移和初始化
  initializeApp();
  
  // 3. 设置全局错误处理
  setupGlobalErrorHandling();
  
  console.groupEnd();
}

/**
 * 设置全局错误处理
 */
function setupGlobalErrorHandling() {
  // 处理未捕获的JavaScript错误
  window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    // 可以在这里添加错误报告逻辑
  });

  // 处理未捕获的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
    // 可以选择防止显示浏览器默认的拒绝提示
    // event.preventDefault();
  });
}

/**
 * 获取应用初始化状态信息（用于调试）
 */
export function getAppInitializationInfo() {
  return {
    browserState: getBrowserStateMigrationInfo(),
    compatibility: checkAppCompatibility(),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };
}