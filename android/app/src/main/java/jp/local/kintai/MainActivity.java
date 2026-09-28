package jp.local.kintai;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String CLEAR_LEGACY_CACHE =
        "(async()=>{" +
        "try{" +
        "const regs=('serviceWorker' in navigator)?await navigator.serviceWorker.getRegistrations():[];" +
        "const keys=('caches' in window)?await caches.keys():[];" +
        "await Promise.all(regs.map(r=>r.unregister()));" +
        "await Promise.all(keys.map(k=>caches.delete(k)));" +
        "if(regs.length||keys.length)location.reload();" +
        "}catch(e){console.error('legacy cache cleanup failed',e)}" +
        "})()";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = bridge.getWebView();
        webView.clearCache(true);
        // Service Worker と Cache Storage は通常の WebView キャッシュとは別管理。
        // 旧画面が表示された後でも確実に解除できるよう、ネイティブ側から実行する。
        webView.postDelayed(() -> webView.evaluateJavascript(CLEAR_LEGACY_CACHE, null), 1500);
        webView.postDelayed(() -> webView.evaluateJavascript(CLEAR_LEGACY_CACHE, null), 3500);
    }
}
