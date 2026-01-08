import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = localStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('analytics_session_id', sessionId);
    }
  }
  return sessionId;
}

export function usePageTracking(pagePath: string, pageTitle: string) {
  useEffect(() => {
    const trackPageView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('page_views').insert({
          page_path: pagePath,
          page_title: pageTitle,
          user_id: user?.id || null,
          session_id: getSessionId(),
        });
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    trackPageView();
  }, [pagePath, pageTitle]);
}
