import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { TabPage } from '@/components/tabs/TabPage';
import { Loading } from '@/components/ui';
import { signInWith } from '@/lib/signIn';
import { readAuthorizeResult } from '@/lib/wpAuthorize';

/**
 * kidsoverprofits://reviewer-auth?user_login=&password=: WordPress's Authorize Application answer, when the phone
 * opens it as a link instead of handing it to the sign-in screen. Saves the login and goes back to that screen.
 */
export default function ReviewerAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      const result = readAuthorizeResult(params);
      if (result.kind === 'ok') await signInWith(result.creds);
      if (router.canGoBack()) router.back();
      else router.replace('/reviewer');
    })();
  }, [params, router]);

  return (
    <TabPage>
      <Loading label="Signing in" />
    </TabPage>
  );
}
