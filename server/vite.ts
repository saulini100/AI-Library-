import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      // Add performance optimizations
      fs: {
        strict: false, // Allow more flexibility for Vite internal files
        allow: ['..', '../..'],
      },
    },
    // Enable pre-bundling for faster startup
    optimizeDeps: {
      include: ['react', 'react-dom'],
      force: false,
    },
    appType: "custom",
    // Performance optimizations
    esbuild: {
      target: 'esnext', // Use modern target for better performance
    },
    build: {
      minify: false, // Faster builds in development
      sourcemap: true, // Enable sourcemaps for debugging
    },
  });

  app.use(vite.middlewares);
  
  // Cache the template to avoid repeated disk reads
  let cachedTemplate: string | null = null;
  let templateLastModified: number = 0;
  
  // Only serve HTML for actual page requests, not for Vite's internal requests
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip Vite internal requests - let Vite middleware handle them
    if (url.startsWith('/@vite/') || 
        url.startsWith('/@fs/') || 
        url.startsWith('/@id/') ||
        url.startsWith('/node_modules/') ||
        url.includes('?import') ||
        url.includes('?direct') ||
        url.includes('?worker') ||
        url.includes('?inline') ||
        url.includes('?url') ||
        url.includes('?raw') ||
        url.endsWith('.js') ||
        url.endsWith('.ts') ||
        url.endsWith('.tsx') ||
        url.endsWith('.jsx') ||
        url.endsWith('.css') ||
        url.endsWith('.scss') ||
        url.endsWith('.sass') ||
        url.endsWith('.less') ||
        url.endsWith('.styl') ||
        url.endsWith('.png') ||
        url.endsWith('.jpg') ||
        url.endsWith('.jpeg') ||
        url.endsWith('.gif') ||
        url.endsWith('.svg') ||
        url.endsWith('.ico') ||
        url.endsWith('.woff') ||
        url.endsWith('.woff2') ||
        url.endsWith('.ttf') ||
        url.endsWith('.eot') ||
        url.endsWith('.map')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // Check if template needs to be reloaded
      const stats = await fs.promises.stat(clientTemplate);
      if (!cachedTemplate || stats.mtime.getTime() > templateLastModified) {
        cachedTemplate = await fs.promises.readFile(clientTemplate, "utf-8");
        templateLastModified = stats.mtime.getTime();
        log("🔄 Reloaded index.html template", "vite");
      }

      // Only add cache-busting in development when HMR is actually needed
      let template = cachedTemplate;
      if (process.env.NODE_ENV === 'development') {
        // Use timestamp-based cache busting instead of random nanoid for consistency
        const timestamp = Math.floor(Date.now() / 10000); // Update every 10 seconds
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${timestamp}"`
        );
      }
      
      const page = await vite.transformIndexHtml(url, template);
      
      // Add caching headers for better performance
      res.set({
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      
      res.status(200).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
