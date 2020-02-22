package com.tutorialkart.webviewexample

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import kotlinx.android.synthetic.main.activity_main.*


class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView.settings.javaScriptEnabled = true

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(
                view: WebView,
                url: String
            ) { // instead of wp-submit you can set your own element id
                webView.loadUrl("javascript:(function(){document.getElementById('wp-submit').click();})();")
            }
        }
        webView.loadUrl("http://ih.ruddha.xyz")

    }
}
