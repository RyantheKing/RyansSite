---
layout: post
title: Hand tracking with a webcam
description: An introduction to image processing with OpenCV
time: 8
repo: https://github.com/RyantheKing/webcam-hand-tracking
tags:
  - code
  - computer vision
  - hackathon
  - python
---

The goal of this project is to learn how to detect movement in OpenCV by making a quick python module that can be used track the hand position a user. Since the code should be short, we will leave out the possibility of training an ML model, as it complicates the code and would not apply generally to all movement. The plan is to track hands by movement (as opposed to a background which remains still).
<br><br>

## Starting the video
The main code will analyze a single frame to check for the position of moving objects. However, some setup is required to get the recording working. \
If you don't already have the [OpenCV](https://docs.opencv.org/4.x/){:target="_blank"} Python package installed, you can install it with `pip install opencv-python`. \
First, we need to create the video feed object and a while loop to iterate through each frame. We also need a background image to compare the hand motion to, so pressing the `x` key will capture the background.
```python
import cv2
import numpy as np

cap = cv2.VideoCapture(0) # the number 0 defines the first connected webcams.
# If you have multiple cameras connected, you will have to increase this number.

bgModel = -1 # this variable will represent the background image

while True:
    ret, frame = cap.read() # get a single frame and return code
    if not ret:
        print("Can't receive frame (stream end?). Exiting ...")
        break
    
    frame = cv2.bilateralFilter(frame, 5, 50, 100) # noise-reducing image smoothing
    frame=cv2.flip(frame,1) # mirror the webcam

    if cv2.waitKey(1) == ord('x'): # check for keys pressed
        bgModel = cv2.createBackgroundSubtractorMOG2(0, 50) # create background model
    
    if bgModel != -1:
        findHandPos_frame(frame, bgModel) # This function will contain our hand position calculations

    cv2.imshow('original', frame) # display frame with hand contours drawn

    if cv2.waitKey(1) == ord('q'): # user can press q to end the loop
        break

cap.release() # release webcam control
cv2.destroyAllWindows() # close opencv windows
```
This code creates a nice loop that will open a window showing what the camera sees. We can pass a frame object to the function called `findHandPos_frame` that will do the calculations for the hand position and draw on the frame. If the `x` button is pressed while the user's hands are not in the frame, we should be able to compare the background to the current frame to figure out where their hands are.
<br><br>

## Finding background changes
The first step to finding the location of moving objects (a hand), is to subtract the background from the current frame. In theory, this gives us an accurate representation of any new or moved objects. In reality, there are lots of subtle movements and noise in the camera that can appear as movement when in reality nothing happened. Our first step to mitigating this was to apply the `cv2.bilateralFilter` the moment we capture a frame. \
\
Once the user has captured an image of the background (`bgModel != -1`), subtract the background from the frame. It will create what is called a "foreground mask" which is all the places in which the background changed. This mask is represented in the form of a binary image, in which pixels/areas that haven't changed are black and areas which have changed (for example, because a hand is covering the background) are colored as white. \
Even though the frame and image being used in calculations are smoothed, some more noise removal is required after generating the foreground mask. Lines 2 and 3 use the `cv2.erode` function to remove small white (foreground) regions where movement due to noise may have been detected. This ideally means only large areas of movement such as the space hands take up will be detected.
```python
fgmask = bgModel.apply(frame,learningRate=0) # apply the background subtraction model and create the foreground mask
kernel = np.ones((3, 3), np.uint8) # create a 3x3 matrix of 1s that is used for line 3
fgmask = cv2.erode(fgmask, kernel, iterations=1) # Shrink small white regions, removing noise
img = cv2.bitwise_and(frame, frame, mask=fgmask) # bitwise and between the frame and the mask, store in frame
```
The last line performs a bitwise AND between the frame and the foreground mask. `img` will contain the pixels from `frame` that are in the foreground and the other areas (the background) will be black. \
\
At this point, most of the background in the frame should be black. However, there are some small areas that remain that are not part of a hand. Using the foreground image, we can further narrow down the accuracy of the mask. We will make the image grayscale, blur it, and then convert it to a binary image. This process will help filter out some of the more noisy dark areas of the background that were not caught by the initial background removal. On the third line, the threshold is set to 60. Generally this works well, but you may need to tweak it if the lighting of your room is very bright or very dark, or if the foreground is not well lit.
```python
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) # convert to gray
blur = cv2.GaussianBlur(gray, (41, 41), 0) # blur
_, thresh = cv2.threshold(blur, 60, 255, cv2.THRESH_BINARY) # convert to binary image
```
![Mask](/assets/images/posts/mask.png){:style="display: block; margin: 0 auto;"}
<figcaption>A frame from the mask</figcaption> \
After all this, we should have a solid B&W mask in which all major parts of the foreground are white and the background is black.
<br><br>

## Outlining a hand
Now that we have a bunch of white blobs where foreground objects are, we can find a hand by measuring the blob with the largest area. Smaller blobs would be glitches in the background or small head movements (since ideally the head was captured as part of the "background"). I use `cv2.findContours` to achieve this. `thresh` is our binary image, `cv2.RETR_TREE` defines the contour list so that in the case that a contour blob is nested inside another blob, a tree structure of nested contours is created. This doesn't matter for our purposes however, since we are just checking the area of the blobs. `cv2.CHAIN_APPROX_SIMPLE` is the algorithm for storing the points which compresses the number of points, defining a contour shape by only keeping the necessary ones.
```python
# underscore would normally store the hierarchy buy we don't care
contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE) # find the contours
length = len(contours) # get the number of contours
maxArea = -1
if length > 0:
    for i in range(length): # iterate through each contour
        temp = contours[i]
        area = cv2.contourArea(temp) # check the area of the contour
        if area > maxArea:
            maxArea = area
            ci = i
    res = contours[ci] # return the largest contour
    cv2.drawContours(frame, [res], 0, (0, 255, 0), 2) # draw the largest contour on the frame (ideally a hand)
```
At this point we are done! You should now have a green outline that tracks with your hand or the largest foreground object on the screen! The contour is just a list of points defining the shape that it makes, so you can do any additional necessary math using the contour points.
<br><br>

## Adding some extra processing
The code for this project I wrote for a hackathon that needed not only the hand outline, but coordinates for two different hands. Rather notably, hands are not a single point in space; this means that the hand's "location" needs to be determined somehow. I decided to define this point as the tip of a finger, since a person could hold one finger up and the top of their finger would always be a relatively constant location. To do this, all you need to do is check for the highest point on the contour. Keep in mind, in OpenCV, 0,0 is in the top left.
```python
y_max = frame.shape[0]-1 # y_max should be set to the largest y value (at the bottom of the frame)
for i in range(len(res)): # iterate through the contour
    if res[i][0][1] < y1_max: # check if the this point is less than the current max (higher in the frame)
        y_max = res[i][0][1]
        x_max = res[i][0][0]
cv2.circle(frame, (x_max, y_max), 3, (0, 0, 255), 3) # draw a red circle around the tip of the finger
```
![Result](/assets/images/posts/contour.png){:style="display: block; margin: 0 auto;"}
<figcaption>The result of drawing the contours and highest point on the contour</figcaption> \
You might notice in my image, two hands are being outlined, not just one. To achieve this is pretty straightforward. In my code, I split the frame in half and then process each half separately. This results in finding two contours, one for each side. Then I just draw the contours for each hand on the original frame. \
Another way you could do this is instead of finding the largest contour out of the list of contours, find the two largest contours. Then you would just need to perform any additional computations once on each contour. This might work better if you don't want the screen strictly divided. However, keep in mind that if hands overlap the binary image mask could see them as the same object since a typical webcam has no depth perception. \
\
Finally, remember that everything except the first block of code with the while loop should be in the `findHandPos_frame` function. The function should return the modified frame with lines drawn, the contour object(s), and any other values that you calculate from the contours with extra code. In my case, it looks like this:
```python
return frame, (x1, y1), res
```
\
Thank you for reading! Hopefully you learned some basic skills in OpenCV and now know how to detect object movement against a background.