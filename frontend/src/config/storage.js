// Safe localStorage wrapper to prevent crash in sandboxed/headless/iframe environments
const getLocalStorageSafe = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch (e) {
    return null;
  }
};

const memoryStore = {};

export const safeStorage = {
  getItem(key) {
    const storage = getLocalStorageSafe();
    if (storage) {
      try {
        return storage.getItem(key);
      } catch (e) {
        console.warn(`[SafeStorage] Failed to getItem from localStorage:`, e);
      }
    }
    return memoryStore[key] !== undefined ? memoryStore[key] : null;
  },

  setItem(key, value) {
    const storage = getLocalStorageSafe();
    if (storage) {
      try {
        storage.setItem(key, value);
        return;
      } catch (e) {
        console.warn(`[SafeStorage] Failed to setItem to localStorage:`, e);
      }
    }
    memoryStore[key] = String(value);
  },

  removeItem(key) {
    const storage = getLocalStorageSafe();
    if (storage) {
      try {
        storage.removeItem(key);
        return;
      } catch (e) {
        console.warn(`[SafeStorage] Failed to removeItem from localStorage:`, e);
      }
    }
    delete memoryStore[key];
  }
};
