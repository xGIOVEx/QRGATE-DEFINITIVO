export const injectTrackingPixels = (venue) => {
    if (!venue) return;

    // Google Analytics Injection
    if (venue.google_analytics_id) {
        const gaId = venue.google_analytics_id;
        // Prevent duplicate injections
        if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`)) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
            document.head.appendChild(script);

            const scriptInline = document.createElement('script');
            scriptInline.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
            document.head.appendChild(scriptInline);

            console.log(`[Tracking] Injected Google Analytics: ${gaId}`);
        }
    }

    // Meta (Facebook) Pixel Injection
    if (venue.meta_pixel_id) {
        const fbId = venue.meta_pixel_id;
        if (!document.getElementById(`meta-pixel-${fbId}`)) {
            const scriptInline = document.createElement('script');
            scriptInline.id = `meta-pixel-${fbId}`;
            scriptInline.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${fbId}');
        fbq('track', 'PageView');
      `;
            document.head.appendChild(scriptInline);

            const noscript = document.createElement('noscript');
            noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${fbId}&ev=PageView&noscript=1" />`;
            document.head.appendChild(noscript);

            console.log(`[Tracking] Injected Meta Pixel: ${fbId}`);
        }
    }
};

export const trackEvent = (eventName, data = {}) => {
    if (window.gtag) {
        window.gtag('event', eventName, data);
    }
    if (window.fbq) {
        window.fbq('track', eventName, data);
    }
};
