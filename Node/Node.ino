#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h> 
#include <SoftwareSerial.h>
#include <string.h>
int BPM;

void setup() {

  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);                                  //Serial connection
  WiFi.begin("Ruddha Zenfone", "helloworld");   //WiFi connection

  while (WiFi.status() != WL_CONNECTED) {  //Wait for the WiFI connection completion

    delay(500);
    Serial.println("Waiting for connection");

  }

}

void loop() {
  BPM = Serial.read();
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(500);                       // wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
  delay(500);                       // wait for a second

  if (WiFi.status() == WL_CONNECTED) { //Check WiFi connection status

    HTTPClient http;    //Declare object of class HTTPClient

    http.begin("http://15.206.103.78/incoming");      //Specify request destination
    http.addHeader("Content-Type", "text/plain");  //Specify content-type header

    String str= "1234-"+String(BPM); 
    int httpCode = http.POST(str);   //Send the request
    String payload = http.getString();                  //Get the response payload

    Serial.println(httpCode);   //Print HTTP return code
    Serial.println(payload);    //Print request response payload

    http.end();  //Close connection

  } else {

    Serial.println("Error in WiFi connection");

  }

  delay(500);  //Send a request every second

}
