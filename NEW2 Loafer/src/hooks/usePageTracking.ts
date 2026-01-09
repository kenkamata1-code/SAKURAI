import { useEffect } from 'react';
import { apiConfig } from '../lib/aws-config';
import { fetchAuthSession } from 'aws-amplify/auth';

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
        let userId: string | null = null;
        
        // 認証情報を取得（エラーは無視）
        try {
          const session = await fetchAuthSession();
          if (session.tokens?.idToken) {
            const payload = session.tokens.idToken.payload;
            userId = payload.sub as string || null;
          }
        } catch {
          // 未認証の場合はuserIdをnullのままにする
        }

        // ページビューをAPIに送信
        await fetch(`${apiConfig.baseUrl}/page-views`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            page_path: pagePath,
            page_title: pageTitle,
            user_id: userId,
            session_id: getSessionId(),
          }),
        });
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    trackPageView();
  }, [pagePath, pageTitle]);
}
