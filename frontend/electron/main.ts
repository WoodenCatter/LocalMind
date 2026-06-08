import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDevelopment = !app.isPackaged && Boolean(process.env.VITE_DEV_SERVER_URL);
const backendHost = "127.0.0.1";
const backendPort = "8000";
let backendProcess: ChildProcess | null = null;

app.setName("LocalMind");
app.setPath("userData", path.join(app.getPath("appData"), "LocalMind"));

function getPackagedBackendPath() {
  return path.join(process.resourcesPath, "backend", "localmind-backend.exe");
}

function getBackendDataDir() {
  return path.join(app.getPath("userData"), "backend");
}

function prepareBackendDataDir() {
  const backendDataDir = getBackendDataDir();
  fs.mkdirSync(backendDataDir, { recursive: true });
  fs.mkdirSync(path.join(backendDataDir, "uploads"), { recursive: true });
  fs.mkdirSync(path.join(backendDataDir, "extracted_text"), { recursive: true });
  fs.mkdirSync(path.join(backendDataDir, "chunks"), { recursive: true });
  fs.mkdirSync(path.join(backendDataDir, "chroma_db"), { recursive: true });
  fs.mkdirSync(path.join(backendDataDir, "data"), { recursive: true });

  const packagedEnvExample = path.join(process.resourcesPath, "backend", ".env.example");
  const userEnvExample = path.join(backendDataDir, ".env.example");
  if (fs.existsSync(packagedEnvExample) && !fs.existsSync(userEnvExample)) {
    fs.copyFileSync(packagedEnvExample, userEnvExample);
  }

  return backendDataDir;
}

function startBackend() {
  if (isDevelopment || backendProcess) {
    return;
  }

  const backendExecutable = getPackagedBackendPath();
  if (!fs.existsSync(backendExecutable)) {
    return;
  }

  const backendDataDir = prepareBackendDataDir();
  backendProcess = spawn(backendExecutable, [], {
    cwd: backendDataDir,
    env: {
      ...process.env,
      LOCALMIND_BASE_DIR: backendDataDir,
      LOCALMIND_HOST: backendHost,
      LOCALMIND_PORT: backendPort
    },
    stdio: "ignore",
    windowsHide: true
  });

  backendProcess.on("exit", () => {
    backendProcess = null;
  });
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    if (process.platform === "win32" && backendProcess.pid) {
      try {
        execFileSync(
          "taskkill",
          ["/pid", String(backendProcess.pid), "/T", "/F"],
          { stdio: "ignore" }
        );
      } catch {
        backendProcess.kill();
      }
    } else {
      backendProcess.kill();
    }
    backendProcess = null;
  }
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "LocalMind",
    backgroundColor: "#f6f7f9",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}

ipcMain.handle("localmind:select-import-files", async () => {
  const result = await dialog.showOpenDialog({
    title: "选择要导入 LocalMind 的文件",
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Supported files",
        extensions: ["pdf", "docx", "pptx", "txt", "md", "png", "jpg", "jpeg", "bmp", "webp"]
      }
    ]
  });

  if (result.canceled) {
    return [];
  }

  return result.filePaths.map((filePath) => {
    const stat = fs.statSync(filePath);
    return {
      filePath,
      name: path.basename(filePath),
      size: stat.size,
      lastModified: stat.mtimeMs
    };
  });
});

app.whenReady().then(() => {
  startBackend();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBackend();
});
