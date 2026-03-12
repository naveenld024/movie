package com.joyflix.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable full WebView capabilities for JoyFlix player
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // Enable hardware acceleration for smooth video
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);

        // Allow remote debugging via Chrome DevTools
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
