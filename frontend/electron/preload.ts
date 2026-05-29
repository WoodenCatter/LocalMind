import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("localmind", {
  appName: "LocalMind"
});

