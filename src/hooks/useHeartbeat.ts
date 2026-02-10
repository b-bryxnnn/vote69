import { useEffect } from 'react';

export function useHeartbeat(enabled: boolean = true) {
    useEffect(() => {
        if (!enabled) return;

        const sendHeartbeat = async () => {
            try {
                await fetch('/api/auth/heartbeat', { method: 'POST', keepalive: true });
            } catch (err) {
                // Ignore errors to avoid console spam
            }
        };

        // Send immediately
        sendHeartbeat();

        // Then every 30 seconds
        const interval = setInterval(sendHeartbeat, 30000);

        // Also send when window gains focus
        const onFocus = () => sendHeartbeat();
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [enabled]);
}
