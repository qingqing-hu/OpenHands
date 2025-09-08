import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, render } from "@testing-library/react";
import React from "react";

// Mock RealBrowserTab component
vi.mock("#/components/features/browser/real-browser-tab", () => ({
  RealBrowserTab: ({ conversationId }: { conversationId: string }) => (
    <div data-testid="real-browser-tab" data-conversation-id={conversationId}>
      真实浏览器选项卡组件
    </div>
  ),
}));

// Mock conversation ID hook
vi.mock("#/hooks/use-conversation-id", () => ({
  useConversationId: () => ({ conversationId: "test-conversation-id" }),
}));

// Import the component after all mocks are set up
import { BrowserPanel } from "#/components/features/browser/browser";

describe("BrowserPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("应该正确渲染RealBrowserTab组件", () => {
    render(<BrowserPanel />);

    const browserTab = screen.getByTestId("real-browser-tab");
    expect(browserTab).toBeInTheDocument();
    expect(browserTab).toHaveAttribute("data-conversation-id", "test-conversation-id");
    expect(screen.getByText("真实浏览器选项卡组件")).toBeInTheDocument();
  });

  it("应该正确传递conversationId给RealBrowserTab", () => {
    render(<BrowserPanel />);

    const browserTab = screen.getByTestId("real-browser-tab");
    expect(browserTab).toHaveAttribute("data-conversation-id", "test-conversation-id");
  });

  it("应该具有正确的容器样式", () => {
    render(<BrowserPanel />);

    const container = screen.getByTestId("real-browser-tab").parentElement;
    expect(container).toHaveClass("h-full", "w-full");
  });
});
