/**
 * Supabase Client & Global Configuration
 * Shared between customer storefront and merchant admin panel
 */

// Admin Dashboard Global Passcode
window.ADMIN_PASSCODE = "vis2000is";

const SUPABASE_URL = "https://wrzpjsekrxzkyaogsqxb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyenBqc2Vrcnh6a3lhb2dzcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTA5OTMsImV4cCI6MjEwNzgyNjk5M30.h86kOSRyTv7F14rJx3xrchlClLCxcMQwZpkn_8EUqQ0";

let supabaseClient = null;

/**
 * Initialize Supabase Client instance safely
 */
function initSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }
  return null;
}

// Attempt immediate initialization
initSupabaseClient();

// Global Configuration Export
window.SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  getClient: () => {
    if (!supabaseClient) {
      initSupabaseClient();
    }
    return supabaseClient;
  }
};