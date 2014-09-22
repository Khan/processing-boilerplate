int padding = 50;
float startX, startY, endX, endY;

class Circle {
	float x, y;
	int diameter = 20;
}
Circle c = new Circle();

Ani aniX;
Ani aniY;

void setup() {
  size(512,512);
  smooth();

  startX = 0 + padding;
  startY = height - padding;
  endX = width - padding;
  endY = 0 + padding;

  c.x = startX;
  c.y = startY;

  // Ani.init() must be called always first!
  Ani.init(this);
  aniX = Ani.to(c, 5, 1, "x", endX, Ani.LINEAR);
  aniY = Ani.to(c, 5, 1, "y", endY, Ani.ELASTIC_OUT);
}

void draw() {
  // seek
  if (mousePressed == true) {
    float seekValue = mouseX/(float)width;
    aniX.seek(seekValue);
    aniY.seek(seekValue);
  }

  // draw everything
  background(255);
  line(startX, startY, endX, endY);
  fill(0);
  ellipse(c.x, c.y, c.diameter, c.diameter);
  ellipse(c.x, startY, c.diameter/4, c.diameter/4);
  ellipse(startX, c.y, c.diameter/4, c.diameter/4);
}

// pause
void mousePressed() {
  aniX.pause();
  aniY.pause();
}

// resume
void mouseReleased() {
  aniX.resume();
  aniY.resume();
}

// pause and resume animation by pressing SPACE
void keyPressed() {
  if (key == ' ') {
    if (aniX.isPlaying() && aniY.isPlaying()) {
      aniX.pause();
      aniY.pause();
    }
    else {
      aniX.resume();
      aniY.resume();
    }
  }
}













