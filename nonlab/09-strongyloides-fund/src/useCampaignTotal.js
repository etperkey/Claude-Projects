import { useEffect, useState } from 'react';

// GiveSendGo's public campaign endpoint. CORS is open (access-control-allow-origin: *)
// so we can call this directly from the browser. Returned fields of interest:
//   campaign_total_amount: string like "1847.00"
//   campaign_goal_amount:  string like "2200000"
//   last_donation_time:    "YYYY-MM-DD HH:MM:SS"
const GSG_URL = 'https://www.givesendgo.com/api/v2/campaigns/ivermectinfund';
const CACHE_KEY = 'gsg_ivermectinfund_cache';
const TTL_MS = 60_000; // 1 minute; the number does not change that often

export function useCampaignTotal(fallback = { raised: 1847, goal: 2200000 }) {
  const [state, setState] = useState(() => {
    // Seed from cache if fresh, else fallback
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.ts < TTL_MS) {
        return { ...cached.data, loading: false, fromCache: true };
      }
    } catch { /* ignore */ }
    return { ...fallback, loading: true, fromCache: false };
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(GSG_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const raised = parseFloat(json.campaign_total_amount) || fallback.raised;
        const goal = parseFloat(json.campaign_goal_amount) || fallback.goal;
        const lastDonation = json.last_donation_time || null;
        const data = { raised, goal, lastDonation };
        if (!cancelled) {
          setState({ ...data, loading: false, fromCache: false });
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
        }
      } catch (err) {
        // Silent fall-back to the seed values. Don't show an error to the user —
        // the page still works with the stale/hardcoded numbers.
        if (!cancelled) setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
    })();
    return () => { cancelled = true; };
  }, [fallback.raised, fallback.goal]);

  return state;
}
