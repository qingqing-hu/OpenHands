/// <reference types="vitest" />
/// <reference types="vite-plugin-svgr/client" />
import { defineConfig, loadEnv } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";
import { reactRouter } from "@react-router/dev/vite";
import { configDefaults } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  
  const {
    VITE_BACKEND_HOST = "127.0.0.1:3000",
    VITE_USE_TLS = "false",
    VITE_FRONTEND_PORT = "3001",
    VITE_INSECURE_SKIP_VERIFY = "false",
    VITE_BASE_PATH = "/openhands",
  } = { ...env, ...process.env };

  const USE_TLS = VITE_USE_TLS === "true";
  const INSECURE_SKIP_VERIFY = VITE_INSECURE_SKIP_VERIFY === "true";
  const PROTOCOL = USE_TLS ? "https" : "http";
  const WS_PROTOCOL = USE_TLS ? "wss" : "ws";

  const API_URL = `${PROTOCOL}://${VITE_BACKEND_HOST}/`;
  const WS_URL = `${WS_PROTOCOL}://${VITE_BACKEND_HOST}/`;
  const FE_PORT = Number.parseInt(VITE_FRONTEND_PORT, 10);

  // Ensure base path ends with / if not root
  const basePath = VITE_BASE_PATH === '/' ? '/' : `${VITE_BASE_PATH}/`;
  
  return {
    base: basePath,
    define: {
      // Make VITE_BASE_PATH available at runtime
      __VITE_BASE_PATH__: JSON.stringify(VITE_BASE_PATH),
    },
    plugins: [
      !process.env.VITEST && reactRouter(),
      viteTsconfigPaths(),
      svgr(),
      tailwindcss(),
      // Custom plugin to handle base tag injection
      {
        name: 'inject-base-tag',
        transformIndexHtml(html) {
          const baseTag = VITE_BASE_PATH && VITE_BASE_PATH !== '/' 
            ? `<base href="${basePath}" />` 
            : '';
          return html.replace('%VITE_BASE_TAG%', baseTag);
        },
      },
    ],
    server: {
      port: FE_PORT,
      host: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/ws": {
          target: WS_URL,
          ws: true,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/socket.io": {
          target: WS_URL,
          ws: true,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
          // rewriteWsOrigin: true,
        },
        // Support base path + socket.io for internal network gateway routing
        [`${VITE_BASE_PATH}/socket.io`]: {
          target: WS_URL,
          ws: true,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
          // Remove the base path when proxying to backend
          pathRewrite: {
            [`^${VITE_BASE_PATH}/socket.io`]: '/socket.io'
          }
        },
      },
      watch: {
        ignored: ["**/node_modules/**", "**/.git/**"],
      },
    },
    ssr: {
      noExternal: ["react-syntax-highlighter"],
    },
    clearScreen: false,
    test: {
      environment: "jsdom",
      setupFiles: ["vitest.setup.ts"],
      exclude: [...configDefaults.exclude, "tests"],
      coverage: {
        reporter: ["text", "json", "html", "lcov", "text-summary"],
        reportsDirectory: "coverage",
        include: ["src/**/*.{ts,tsx}"],
      },
    },
  };
});
