package com.tutorialkart.webviewexample

import android.os.Bundle
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import kotlinx.android.synthetic.main.activity_main.*


class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

       // webView.setWebViewClient(WebViewClient())
        webView.webViewClient = WebViewClient()
        webView.loadUrl("http://ih.ruddha.xyz")

    }
}
