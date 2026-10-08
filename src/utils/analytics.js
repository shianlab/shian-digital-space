// Optional analytics is inactive until the site's own key AND host are supplied.
const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
const host = import.meta.env.VITE_POSTHOG_HOST?.trim();
const enabled = Boolean(key && host);
const client = enabled ? import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, { api_host: host, person_profiles: 'identified_only' });
    return posthog;
}).catch(error => { console.warn('统计服务加载失败', error); return null; }) : null;

export function captureEvent(name, properties) {
    if (client) client.then(posthog => posthog?.capture(name, properties));
}
