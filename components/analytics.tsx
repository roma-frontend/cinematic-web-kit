import Script from 'next/script';

/**
 * Privacy-first analytics via Cloudflare Web Analytics.
 *
 * Cloudflare Web Analytics is cookieless and doesn't fingerprint or track users
 * across sites — it collects aggregate traffic + Core Web Vitals (LCP, INP, CLS)
 * using the Real User Monitoring (RUM) beacon. No consent banner needed.
 *
 * Set NEXT_PUBLIC_CF_BEACON_TOKEN in .env.local to enable. Without a token this
 * renders nothing, so local/dev builds stay clean.
 */
export function Analytics() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  return (
    <>
      {token && (
        <Script
          id="cf-web-analytics"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon={JSON.stringify({ token })}
        />
      )}

      {/*
        PostHog — product analytics, session replay, feature flags & A/B tests.
        Free tier: ~1M events/mo. Loaded via the official snippet (no npm dep) and
        gated on NEXT_PUBLIC_POSTHOG_KEY, so it's inert until you add a key.
        Autocapture is on; tune options at app.posthog.com → Project settings.
      */}
      {posthogKey && (
        <Script id="posthog-js" strategy="afterInteractive">
          {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init(${JSON.stringify(posthogKey)},{api_host:${JSON.stringify(posthogHost)},person_profiles:'identified_only',capture_pageview:true,capture_pageleave:true});`}
        </Script>
      )}
    </>
  );
}
