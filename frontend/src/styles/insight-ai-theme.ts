// InsightAI Theme Configuration

export const insightAITheme = {
  colors: {
    primary: '#0072f5',
    primaryDark: '#005cc5',
    primaryLight: '#3999f5',
    
    background: '#080808',
    surface: '#1a1a1a',
    surfaceHover: '#222222',
    surfaceActive: '#2a2a2a',
    
    textPrimary: '#ffffff',
    textSecondary: '#b4b4b4',
    textMuted: '#8a8a8a',
    
    border: '#333333',
    borderLight: '#404040',
    borderDark: '#2a2a2a',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#14acf3ff',
    info: '#06b6d4',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  transition: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
} as const;

export type InsightAITheme = typeof insightAITheme;

// CSS Custom Properties helper
export const getInsightAICSSVars = () => ({
  '--insight-primary': insightAITheme.colors.primary,
  '--insight-primary-dark': insightAITheme.colors.primaryDark,
  '--insight-primary-light': insightAITheme.colors.primaryLight,
  '--insight-background': insightAITheme.colors.background,
  '--insight-surface': insightAITheme.colors.surface,
  '--insight-surface-hover': insightAITheme.colors.surfaceHover,
  '--insight-surface-active': insightAITheme.colors.surfaceActive,
  '--insight-text-primary': insightAITheme.colors.textPrimary,
  '--insight-text-secondary': insightAITheme.colors.textSecondary,
  '--insight-text-muted': insightAITheme.colors.textMuted,
  '--insight-border': insightAITheme.colors.border,
  '--insight-border-light': insightAITheme.colors.borderLight,
  '--insight-border-dark': insightAITheme.colors.borderDark,
  '--insight-success': insightAITheme.colors.success,
  '--insight-warning': insightAITheme.colors.warning,
  '--insight-error': insightAITheme.colors.error,
  '--insight-info': insightAITheme.colors.info,
});

// Tailwind CSS class name utilities for InsightAI theme
export const insightAIClasses = {
  layout: {
    base: 'insight-ai-layout',
    sidebar: 'insight-ai-sidebar',
    sidebarCollapsed: 'insight-ai-sidebar collapsed',
    main: 'insight-ai-main',
    content: 'insight-ai-content',
  },
  
  components: {
    button: 'insight-ai-button',
    buttonPrimary: 'insight-ai-button primary',
    buttonGhost: 'insight-ai-button ghost',
    input: 'insight-ai-input',
    card: 'insight-ai-card',
    tab: 'insight-ai-tab',
    tabActive: 'insight-ai-tab active',
    tabPanel: 'insight-ai-tab-panel',
    message: 'insight-ai-message',
    messageUser: 'insight-ai-message user',
    messageAssistant: 'insight-ai-message assistant',
  },
  
  animations: {
    fadeIn: 'insight-ai-fade-in',
    slideIn: 'insight-ai-slide-in',
    skeleton: 'insight-ai-skeleton',
  },
  
  utilities: {
    scrollbar: 'insight-ai-scrollbar',
    srOnly: 'insight-ai-sr-only',
  },
} as const;