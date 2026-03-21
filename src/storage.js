window.storage = {
  get:    async (key)        => { const v = localStorage.getItem(key); return v ? { value: v } : null; },
  set:    async (key, value) => { localStorage.setItem(key, value); return { value }; },
  delete: async (key)        => { localStorage.removeItem(key); return { deleted: true }; },
};