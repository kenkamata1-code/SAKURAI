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

        // 流入元を取得
        const referrer = document.referrer || 'direct';
        let referrerSource = 'direct';
        if (referrer && referrer !== 'direct') {
          try {
            const url = new URL(referrer);
            if (url.hostname.includes('google')) referrerSource = 'Google';
            else if (url.hostname.includes('yahoo')) referrerSource = 'Yahoo';
            else if (url.hostname.includes('bing')) referrerSource = 'Bing';
            else if (url.hostname.includes('instagram')) referrerSource = 'Instagram';
            else if (url.hostname.includes('facebook') || url.hostname.includes('fb.')) referrerSource = 'Facebook';
            else if (url.hostname.includes('twitter') || url.hostname.includes('x.com')) referrerSource = 'X (Twitter)';
            else if (url.hostname.includes('youtube')) referrerSource = 'YouTube';
            else if (url.hostname.includes('line.')) referrerSource = 'LINE';
            else if (url.hostname === window.location.hostname) referrerSource = 'internal';
            else referrerSource = url.hostname;
          } catch {
            referrerSource = 'other';
          }
        }

        // ページビューをAPIに送信（/v1/page-views）
        await fetch(`${apiConfig.baseUrl}/v1/page-views`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            page_path: pagePath,
            page_title: pageTitle,
            user_id: userId,
            session_id: getSessionId(),
            referrer: referrerSource,
          }),
        });
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    trackPageView();
  }, [pagePath, pageTitle]);
}
