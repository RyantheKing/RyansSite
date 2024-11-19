---
layout: post
title: Control your mouse with a VR Headset
time: 5
repo: https://github.com/RyantheKing/Hand-Controlled-Mouse-Cursor
tags:
  - code
  - virtual reality
  - computer vision
---

## The Problem
Imagine being able to control your computer while sitting reclined in your chair, similar to a TV, but instead of using a remote, you could just point and gesture with your hands. Sounds great! \
Such technology is possible and already exists through the use of depth cameras that can accurately see the position of objects in 3D space. However, such [cameras](https://www.amazon.com/Intel-Realsense-D435-Webcam-FPS/dp/B07BLS5477/){:target="_blank"} can be very expensive and I am very cheap (or frugal, I like that word better). \
\
However, there is a solution! (although only if you find youself in the exact situation as me). I happen to have a Quest 2 VR headset. Overall it is a decent headset that is not without it's flaws. I simply got it because it was the cheapest VR headset for games on the market at the time. The important part though, is that it's external cameras make it capable of hand tracking! It started out weak at first but is getting better as a result of continuous updates to the software from Oculus.
<br><br>

## The Plan
Typically, VR headsets are designed to be worn on your head (no shit, Sherlock, I hear you say). However, this creates some issues if we want to use our physical computer monitors. Yes, there are many tools that allow you to create virtual desktop screens while wearing your headset, but that is not our goal for this project. I am trying to stay more connected to my surroundings, plus the whole point is simply to use the headset as a glorified depth camera. \
\
After some testing, I discovered the best place to position the headset is above one's head. The Oculus Quest is already designed to hand-track well with your hands in front of you and below your face. This means what the headset sees will be similar to what it sees when it is on your head. For this purpose, I created a makeshift mount on the back of my desk chair that holds the headset (on a styrofoam mannequin head). \
It is worth nothing here that you could also position the headset above your computer monitor, facing you (similar to where a webcam might be). I did some tests with this setup and the range that the cameras can see is excellent. However, the headset is seeing your hands from the perspective of a mirror instead of your head. This means the hands appear switched and backwards. Getting the hand tracking SDK to work for this was very finnicky, and while it is definetly viable, I chose to just mount the headset above my head. \

![My headset setup](/assets/images/posts/vrsetup.png){:style="display: block; margin: 0 auto;"}
<figcaption>My personal setup (you can see a mannequin head atop a PVC pipe behind my head)</figcaption> \
The last thing we need to do is ensure that the headset stays on. The Quest 2 has a proximity sensor between the lenses that can detect if you are wearing it. To make our lives a lot easier we will hve to disable it. You will need to put your headset in developer mode (there are many guides online for this) and then disable the proximity sensor in SideQuest. \
\
![Proximity disable](/assets/images/posts/proximity.png){:style="display: block; margin: 0 auto;"}
<figcaption>The setting to disable the proximity sensor in SideQuest</figcaption> \
[SideQuest](https://sidequestvr.com/setup-howto){:target="_blank"} is a wonderful tool with lots of debugging, file management, and developer options for the Quest headsets. I use it later to sideload my Unity app to the headset and also as a general debugging tool due to the ADB features it has.
<br><br>

## Unity Setup
To get this to work we need 3 things. Hand tracking data being recorded on the headset, mouse control on our PC, and a bridge between the two. First I will discuss how I recorded hand tracking data on the Quest. Lucky for me, 