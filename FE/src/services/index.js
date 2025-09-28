import { storageApi } from "./storageApi";
import { storageLocal } from "./storageLocal";

// Se VITE_MODE=api -> usa backend; altrimenti local
const mode = (import.meta.env.VITE_MODE || "local").toLowerCase();
export const storage = mode === "api" ? storageApi : storageLocal;
export const isAPI = storage.mode === "api";
