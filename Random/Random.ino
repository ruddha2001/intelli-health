#include <Adafruit_SSD1306.h>
#include <math.h>
#include <SoftwareSerial.h>
SoftwareSerial s(3, 1);
#define OLED_Address 0x3C
Adafruit_SSD1306 oled(128, 64);

int a = 0;
int lasta = 0;
int lastb = 0;
int LastTime = 0;
int ThisTime;
bool BPMTiming = false;
bool BeatComplete = false;
int BPM = 0;
#define UpperThreshold 560
#define LowerThreshold 530

void setup() {
  Serial.begin(115200);
  s.begin(115200);
  Serial.println(BPM);
  delay(500);
  oled.begin(SSD1306_SWITCHCAPVCC, OLED_Address);
  oled.clearDisplay();
  oled.setTextSize(2);
}

void loop()
{
  if (a > 127)
  {
    oled.clearDisplay();
    a = 0;
    lasta = a;
  }

  ThisTime = millis();
  int value = analogRead(0);
  oled.setTextColor(WHITE);
  int b = 60 - (value / 16);
  oled.writeLine(lasta, lastb, a, b, WHITE);
  lastb = b;
  lasta = a;

  BPM = random(70, 80);
  tone(8, 1000, 250);

  oled.writeFillRect(0, 50, 128, 16, BLACK);
  oled.setCursor(0, 50);
  oled.print("BPM:");
  oled.print(BPM);

  oled.display();
  a++;
  Serial.println(BPM);
  delay(1000);
  s.write(BPM);
  delay(500);
}
