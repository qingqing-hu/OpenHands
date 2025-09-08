/**
 * 浏览器状态迁移工具测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isLegacyBrowserState,
  migrateBrowserState,
  migrateStoredBrowserState,
  isValidNewBrowserState,
  getOrMigrateBrowserState,
  cleanupLegacyBrowserData,
  performBrowserStateMigration,
  getBrowserStateMigrationInfo,
} from '../../src/utils/browser-state-migration';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('浏览器状态迁移工具', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('isLegacyBrowserState', () => {
    it('应该正确识别旧的浏览器状态', () => {
      const legacyState = {
        url: 'https://example.com',
        screenshotSrc: 'data:image/png;base64,abc123',
      };

      expect(isLegacyBrowserState(legacyState)).toBe(true);
    });

    it('应该正确识别新的浏览器状态', () => {
      const newState = {
        currentUrl: 'https://example.com',
        isLoading: false,
        history: ['https://example.com'],
        historyIndex: 0,
      };

      expect(isLegacyBrowserState(newState)).toBe(false);
    });

    it('应该处理null或undefined状态', () => {
      expect(isLegacyBrowserState(null)).toBe(false);
      expect(isLegacyBrowserState(undefined)).toBe(false);
      expect(isLegacyBrowserState({})).toBe(false);
    });
  });

  describe('migrateBrowserState', () => {
    it('应该正确迁移旧状态到新状态', () => {
      const legacyState = {
        url: 'https://github.com',
        screenshotSrc: 'data:image/png;base64,screenshot',
      };

      const migratedState = migrateBrowserState(legacyState);

      expect(migratedState).toEqual({
        currentUrl: 'https://github.com',
        isLoading: false,
        error: undefined,
        history: ['https://github.com'],
        historyIndex: 0,
        autoSwitchEnabled: true,
        downloadInProgress: false,
      });
    });

    it('应该处理空URL的情况', () => {
      const legacyState = {
        url: '',
        screenshotSrc: '',
      };

      const migratedState = migrateBrowserState(legacyState);

      expect(migratedState.currentUrl).toBe('https://github.com/All-Hands-AI/OpenHands');
      expect(migratedState.history).toEqual(['https://github.com/All-Hands-AI/OpenHands']);
    });
  });

  describe('migrateStoredBrowserState', () => {
    it('应该从localStorage迁移旧状态', () => {
      const legacyState = {
        url: 'https://example.com',
        screenshotSrc: 'data:image/png;base64,test',
      };

      localStorageMock.setItem('browserState', JSON.stringify(legacyState));

      const result = migrateStoredBrowserState();

      expect(result).toEqual({
        currentUrl: 'https://example.com',
        isLoading: false,
        error: undefined,
        history: ['https://example.com'],
        historyIndex: 0,
        autoSwitchEnabled: true,
        downloadInProgress: false,
      });

      // 验证新状态已保存
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'browserState',
        JSON.stringify(result)
      );
    });

    it('应该返回已存在的新状态', () => {
      const newState = {
        currentUrl: 'https://existing.com',
        isLoading: false,
        error: undefined,
        history: ['https://existing.com'],
        historyIndex: 0,
        autoSwitchEnabled: true,
        downloadInProgress: false,
      };

      localStorageMock.setItem('browserState', JSON.stringify(newState));

      const result = migrateStoredBrowserState();

      expect(result).toEqual(newState);
    });

    it('应该处理localStorage中没有数据的情况', () => {
      const result = migrateStoredBrowserState();
      expect(result).toBe(null);
    });

    it('应该处理无效JSON数据', () => {
      localStorageMock.setItem('browserState', 'invalid json');

      const result = migrateStoredBrowserState();

      expect(result).toBe(null);
    });
  });

  describe('isValidNewBrowserState', () => {
    it('应该验证有效的新状态', () => {
      const validState = {
        currentUrl: 'https://example.com',
        isLoading: false,
        error: undefined,
        history: ['https://example.com'],
        historyIndex: 0,
        autoSwitchEnabled: true,
        downloadInProgress: false,
      };

      expect(isValidNewBrowserState(validState)).toBe(true);
    });

    it('应该拒绝缺少必要字段的状态', () => {
      const invalidState = {
        currentUrl: 'https://example.com',
        // 缺少其他必要字段
      };

      expect(isValidNewBrowserState(invalidState)).toBe(false);
    });

    it('应该拒绝字段类型不正确的状态', () => {
      const invalidState = {
        currentUrl: 123, // 应该是字符串
        isLoading: false,
        error: undefined,
        history: ['https://example.com'],
        historyIndex: 0,
        autoSwitchEnabled: true,
        downloadInProgress: false,
      };

      expect(isValidNewBrowserState(invalidState)).toBe(false);
    });
  });

  describe('cleanupLegacyBrowserData', () => {
    it('应该清理旧的localStorage数据', () => {
      // 设置一些旧的数据
      localStorageMock.setItem('browser', 'old data');
      localStorageMock.setItem('browserScreenshot', 'old screenshot');
      localStorageMock.setItem('browserUrl', 'old url');
      localStorageMock.setItem('keepThis', 'should not be removed');

      cleanupLegacyBrowserData();

      // 验证旧数据被清理
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('browser');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('browserScreenshot');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('browserUrl');

      // 验证其他数据没有被删除
      expect(localStorageMock.getItem('keepThis')).toBe('should not be removed');
    });
  });

  describe('performBrowserStateMigration', () => {
    it('应该执行完整的迁移流程', () => {
      const legacyState = {
        url: 'https://test.com',
        screenshotSrc: 'screenshot data',
      };

      localStorageMock.setItem('browserState', JSON.stringify(legacyState));
      localStorageMock.setItem('browser', 'old browser data'); // 应该被清理

      const result = performBrowserStateMigration();

      expect(result.migrated).toBe(true);
      expect(result.state.currentUrl).toBe('https://test.com');
      
      // 验证清理工作
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('browser');
    });

    it('应该处理没有需要迁移数据的情况', () => {
      const result = performBrowserStateMigration();

      expect(result.migrated).toBe(false);
      expect(result.state.currentUrl).toBe('https://github.com/All-Hands-AI/OpenHands');
      expect(result.state.isLoading).toBe(false);
      expect(result.state.autoSwitchEnabled).toBe(true);
    });
  });

  describe('getBrowserStateMigrationInfo', () => {
    it('应该提供迁移信息用于调试', () => {
      const legacyState = {
        url: 'https://debug.com',
        screenshotSrc: 'debug data',
      };

      localStorageMock.setItem('browserState', JSON.stringify(legacyState));

      const info = getBrowserStateMigrationInfo();

      expect(info.hasStoredState).toBe(true);
      expect(info.isLegacy).toBe(true);
      expect(info.isValid).toBe(false);
      expect(info.currentState).toEqual(legacyState);
    });

    it('应该处理没有存储状态的情况', () => {
      const info = getBrowserStateMigrationInfo();

      expect(info.hasStoredState).toBe(false);
      expect(info.isLegacy).toBe(false);
      expect(info.isValid).toBe(false);
      expect(info.currentState).toBe(null);
    });
  });
});