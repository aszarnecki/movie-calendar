import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

window.storage = {
  get: async (key) => {
    const { data } = await supabase
      .from("cinema_data")
      .select("value")
      .eq("key", key)
      .single();
    return data ? { value: data.value } : null;
  },
  set: async (key, value) => {
    await supabase
      .from("cinema_data")
      .upsert({ key, value });
    return { value };
  },
  delete: async (key) => {
    await supabase
      .from("cinema_data")
      .delete()
      .eq("key", key);
    return { deleted: true };
  },
};
