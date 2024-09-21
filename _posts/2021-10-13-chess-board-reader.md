---
layout: post
title: Reading a chess board with computer vision
time: 35
repo: https://github.com/RyantheKing/chess-detector
tags:
  - code
  - computer vision
  - python
---

## Detecting pieces on a chess board
The goal of this project was intially to be able to read a chess board and convert an image from an overhead webcam to a PGN string (Portable Game Notation). This way one could quickly read the board, and then given who's turn it was, use other APIs to return a best move for the user. \
This initially required a 2-step solution:
1. Take a picture of the board and seperate it into 64 sub-images, each containing a single square.
2. Use a specialized AI model to check what type of piece is on each occupied square.

However, as I started on step 2, I realized I had a problem. I could not find any large datasets of chess pieces taken from the top. This would make detecting what type of chess piece is on a square very difficult. Thus, the best I could do without creating my own datasets was to make the camera just detect checkers. It is worth that by taking a video of the board, beginning with the starting position, a program could remember what pieces moved where by tracking where they moved from their previous position. I have a method for this that I will go over later in the article, but it is not fully functional like part 1 is. 
<br><br>

## Tools
For this project I used Python and the computer vision library [OpenCV](https://opencv.org/){:target="_blank"} as well as well-known math libraries like NumPy and SciPy. I also used the [python-chess](https://pypi.org/project/chess/){:target="_blank"} module to track the board configuration, check for legal moves when the camera detects a change in pieces, and determine if an end state such as checkmate or stalemate has been reached. There is no machine learning involved in this project, I will mainly just be talking about the methods by which I used OpenCV to handle image processing without requiring anything else.
<br><br>

## Capturing the board image
The first step is to get an image of the board, and the modify it with some basic functions to make the edge and corner detection easier. \
\
![Board Image](/assets/images/posts/chess2.png){:style="display: block; margin: 0 auto; width: 50%;"}
<figcaption>A photo of a board to work with</figcaption> \
The basic operations are to first get an image of the board using OpenCV-python, then convert it to grayscale and blur it.
```python
img = cv2.imread('board.png') # read image from file
new_img = img.copy() # copy image (I want to manipulate the original image later so I need multiple copies)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) # grayscale conversion
gray_blur = cv2.blur(gray, (5, 5)) # blur
```
![Blurred Image](/assets/images/posts/gray.png){:style="display: block; margin: 0 auto;"}
<figcaption>Initial image after basic filters</figcaption>
<br>

## Detecting corners of board squares
After this, I detect both where the lines on the board are, and then if a piece is on a paticular square. I use the Canny edge detector algorithm here (which is already a part of OpenCV). If you wish to learn more about it, OpenCV explains it [here](https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html){:target="_blank"}. Essentially, it checks for where the color gradient in the image changes substantially, thus mapping out all the edges. The `cv2.Canny` function can take 5 arguments, but the last 2 can be left at default values. The second and third arguments are the lower and upper thresholds for the edge detection, respectively.
```python
edges = cv2.Canny(img, 0, 900)
```
The `edges` variable returns an image that looks like this (after I fiddled with the thresholds a bit). \
\
![Edge Image](/assets/images/posts/edges.png){:style="display: block; margin: 0 auto;"} \
Next I use a Hough Line Transform ([OpenCV page here](https://docs.opencv.org/3.4/d9/db0/tutorial_hough_lines.html){:target="_blank"}) to detect straight lines. One problem however is that the Canny edge detection detected some curved corners. (After all, not all chess boards in the real world are perfect grids). The Hough Line Transform can be configured to only output straight lines that have a certain length threshold (120, in this case), thus only returning the lines that make up the 8x8 board. \
The for loop below converts Cartesian lines to the Polar coordinate system. This will be useful later when checking for intersections between vertical and horizontal lines.
```python
min_line_length=0 # minimum and maximum distance between lines
max_line_gap=3.14 # this helps ensure lines are drawn for all lines on the chess board
lines = cv2.HoughLines(edges, 1, np.pi / 180, 120, min_line_length, max_line_gap)

lines = np.reshape(lines, (-1, 2)) # converting OpenCV to numpy for polar calculations

for rho,theta in lines:
    a = np.cos(theta)
    b = np.sin(theta)
    x0 = a*rho
    y0 = b*rho
    x1 = int(x0 + 1000*(-b))
    y1 = int(y0 + 1000*(a))
    x2 = int(x0 - 1000*(-b))
    y2 = int(y0 - 1000*(a))
```
Next I seperate the lines into horizontal and vertical, and find their intersections.
```python
# seperate to horizontal and vertical lines
h_lines, v_lines = [], []
for rho, theta in lines:
    if theta < np.pi / 4 or theta > np.pi - np.pi / 4: # check if polar angle is horizontal or vertical
        v_lines.append([rho, theta])
    else:
        h_lines.append([rho, theta])

# Locate intersections
points = []
for r_h, t_h in h_lines:
    for r_v, t_v in v_lines: # iterate through all vertical lines for each horizontal line
        a = np.array([[np.cos(t_h), np.sin(t_h)], [np.cos(t_v), np.sin(t_v)]]) # create matricies of angle ratios of theta values
        b = np.array([r_h, r_v]) # create matricies of rho values
        inter_point = np.linalg.solve(a, b) # solve the system of equations using marticies to get intersections of the two lines
        points.append(inter_point) # add to the list of intersection points
intersection_points = np.array(points)
```
This code will create a list of points from all the intersecting lines. However, since I did not set a minimum distance between the Hough lines (this was intentional), there are many points for each actual corner on the chess board clustered closely together. When averaging the clustered points, I get a much more accurate corner location than if I set a minimum distance and only allow one Hough line to be drawn for each line on the grid.
```python
# Cluster points
dists = spatial.distance.pdist(intersection_points)  # computer pairwise distance between each pair of points
single_linkage = cluster.hierarchy.single(dists) # create a hierarchical cluster tree
flat_clusters = cluster.hierarchy.fcluster(single_linkage, 15, 'distance') # group based on points less than 15 units apart
cluster_dict = defaultdict(list) 
for i in range(len(flat_clusters)):
    cluster_dict[flat_clusters[i]].append(points[i]) # append point to cluster index in dictionary
cluster_values = cluster_dict.values()
clusters = map(lambda arr: (np.mean(np.array(arr)[:, 0]), np.mean(np.array(arr)[:, 1])), cluster_values) # calculate the center of each cluster of points
points = sorted(list(clusters), key=lambda k: [k[1], k[0]]) # sort the points
```
Next to do some filtering, I removed all points within 2% of the edge of the image, since Hough lines are sometimes drawn on the actual edges of the image itself. Then dots are drawn on the remaining valid points.
```python
dimensions = img.shape
new_points = []

for point in points:
    # only do this with points not on the edge of the image
    if dimensions[1]*0.02 < point[0] < dimensions[1]-dimensions[1]*0.02 and dimensions[0]*0.02 < point[1] < dimensions[0]-dimensions[0]*0.02:
        new_points.append(point)
        img = cv2.circle(img, (int(point[0]), int(point[1])), radius=3, color=(0, 0, 255), thickness=-1) # draw circles
center = (statistics.mean([i[0] for i in new_points]), statistics.mean([i[1] for i in new_points])) # get centerish point of the board
```
The final step for getting all the data for the corner points is to calculate which 4 points are farthest from the center. This will establish where the corners of the board are in the image. Using this, I can warp the board (since the picture was taken at an angle) to a square image containing only the board and no background.
```python
top_left_max = 0
top_left_coords = (0,0)
bottom_left_max = 0
bottom_left_coords = (0,0)
top_right_max = 0
top_right_coords = (0,0)
bottom_right_max = 0
bottom_right_coords = (0,0)
for i in new_points:
    if i[0]<center[0] and i[1]<center[1]:
        hypot = math.hypot(i[0]-center[0], i[1]-center[1])
        if hypot > top_left_max:
            top_left_max = hypot
            top_left_coords = i
    elif i[0]<center[0] and i[1]>center[1]:
        hypot = math.hypot(i[0]-center[0], i[1]-center[1])
        if hypot > bottom_left_max:
            bottom_left_max = hypot
            bottom_left_coords = i
    elif i[0]>center[0] and i[1]<center[1]:
        hypot = math.hypot(i[0]-center[0], i[1]-center[1])
        if hypot > top_right_max:
            top_right_max = hypot
            top_right_coords = i
    else:
        hypot = math.hypot(i[0]-center[0], i[1]-center[1])
        if hypot > bottom_right_max:
            bottom_right_max = hypot
            bottom_right_coords = i
```
Drawing out all these points and overlaying them onto the original image of the board gives an image like the following: \
\
![Points](/assets/images/posts/points.png){:style="display: block; margin: 0 auto; width=50%;"}
<figcaption>The edge intersection points, corner points, and centerpoint of the board</figcaption>
<br>

## Warping the board to a square and organizing the corner points
As mentioned before, the next step is to warp the image. I did this by using the `cv2.perspectiveTransform` function (it's called such since I am changing the perspective to make it look like the board is being looked at from directly on top instead of at a slight angle).
```python
# create the set of points the contains the corners of the board
pts_src = np.array([[top_left_coords[0], top_left_coords[1]],[top_right_coords[0], top_right_coords[1]],[bottom_right_coords[0],bottom_right_coords[1]],[bottom_left_coords[0], bottom_left_coords[1]]])
  #---- 4 corner points of the black image you want to impose it on
  pts_dst = np.array([[0.0,0.0],[800.0, 0.0],[800.0,800.0],[0.0, 800.0]]) # define a 800px by 800px square to map the image onto
  #---- forming the black image of specific size
  im_dst = np.zeros((800, 800, 3), np.uint8)
  #---- Framing the homography matrix
  h, status = cv2.findHomography(pts_src, pts_dst)
  #---- transforming the image bound in the rectangle to straighten
  im_out = cv2.warpPerspective(img, h, (im_dst.shape[1],im_dst.shape[0]))
  raw_out = cv2.warpPerspective(new_img, h, (im_dst.shape[1],im_dst.shape[0]))

  # apply the same transform that was applied to the image to the corner points (so that the point locations are still accurate in this squared coordinate space)
  temp = cv2.perspectiveTransform(np.array([new_points], dtype=np.float32), h, (im_dst.shape[1],im_dst.shape[0]))
  warped_points = temp.tolist()[0]
```
After this, I can display the points overlayed on the warped original image and it looks like this. \
\
![Warped](/assets/images/posts/warp.png){:style="display: block; margin: 0 auto; width=50%;"}
<figcaption>Original image warped to 800x800 image with warped points overlayed</figcaption> \
One thing you will notice about this image is that not only are there 81 points for each corner of each square on the board, but there are extra corners because this board has a border that is not part of the actual playing space. To fix this, I check if there are more than 9 rows or columns (11 x 11 instead) and pop the extra points. To do this easily, I first organize the points by their x and y values.
```python
new_dimensions = im_out.shape
x_dict = {}
y_dict = {}

for i in warped_points:
    found = False
    for val in x_dict: 
        if val-new_dimensions[1]*0.05 < i[0] < val+new_dimensions[1]*0.05: # check if a point is already cataloged in a column
            found = True
            x_dict[val].append(tuple(i)) # append the point to the column it has a similar x value to.
    if not found:
        x_dict[i[0]] = [tuple(i)] # create a new column for this point's column and all future points belonging to the same column

    found = False
    for val in y_dict:
        if val-new_dimensions[0]*0.05 < i[1] < val+new_dimensions[0]*0.05: # check if a point is already cataloged in a row
            found = True
            y_dict[val].append(tuple(i)) # append the point to the row it has a similar y value to
    if not found:
        y_dict[i[1]] = [tuple(i)] # create a new row for this point and all future points in the same row

x_keys = list(x_dict.keys())
y_keys = list(y_dict.keys())
x_keys.sort()
y_keys.sort()
```
Now that I have a sorted set of points, I can know which sets of points are on the edge of the board and not actually a part of the grid.
```python
# now I have a dictionary of columns and rows that defines which column and which row each point belongs to
if len(x_dict) == 11 and len(y_dict) == 11: # if there are extra points, take the edge points from the sorted keys and pop them
    x_keys.pop(10)
    x_keys.pop(0)
    y_keys.pop(10)
    y_keys.pop(0)

# make new dictionaries so that the key is represented by a column number instead of random coordinates
x_vals={}
count = 1
for i in x_keys:
    x_vals[count] = x_dict[i] # assign the values of x_dict (coordinates) to the column dict
    count+=1

# do the same for the rows
count = len(y_keys)
y_vals={}
for i in y_keys:
    y_vals[count] = y_dict[i] # assign the values of y_dict (coordinates) to the row dict
    count-=1
```
<br>

## Getting piece locations
Finally I have a clear list of the locations where every square is on the image. Now the only thing left is code for determining whether or not a piece is on a square, and what color it is (black or white). \
Here I define a `Square` object for each of the 64 squares on the board and add them all to a dictionary.
```python
raw = cv2.warpPerspective(new_img, h, (im_dst.shape[1],im_dst.shape[0]))
def initialize_board(x_vals, y_vals, raw):
    board_dict = {}
    for index1 in range(1,9): # iterate through columns
        for index2 in range(1,9): # iterate through rows
            # Square takes in coordinates of a square, the coordinate dicts and raw (the original image warped to 800x800)
            board_dict[str(index1)+str(index2)] = board.Square((index1, index2), x_vals, y_vals, raw)
    return board_dict
```
Now each operation to get the piece information on a certain square will run 64 times. \
The below code will take a location tuple like (3,5), which would represent the square c5, and uses the information in `x_dict` and `y_dict` to find the coordinates of the corners surrounding that square and the centerpoint.
```python
def __init__(self, location, x_dict, y_dict, raw):
    self.location = location
    self.coords = [ set(x_dict[location[1]]).intersection(set(y_dict[location[0]])).pop(),
                    set(x_dict[location[1]+1]).intersection(set(y_dict[location[0]])).pop(),
                    set(x_dict[location[1]+1]).intersection(set(y_dict[location[0]+1])).pop(),
                    set(x_dict[location[1]]).intersection(set(y_dict[location[0]+1])).pop()] # the corners
    self.top_y = (self.coords[0][1] + self.coords[1][1])/2
    self.right_x = (self.coords[1][0] + self.coords[2][0])/2
    self.bot_y = (self.coords[2][1] + self.coords[3][1])/2
    self.left_x = (self.coords[3][0] + self.coords[0][0])/2
    self.rect_coords = [(self.left_x, self.top_y), (self.right_x, self.top_y), (self.left_x, self.bot_y), (self.right_x, self.bot_y)] # sqaure formed by corners
    self.center = ((self.left_x+self.right_x)/2, (self.top_y+self.bot_y)/2) # average the corners to get the center
```
Now I process the image like what I did at the start, except I'm only checking a single square instead of the whole board. \
\
One way to determine if a piece is on a square is to convert the image of the square to binary. After cropping the warped image to only contain the square I want, the image is converted to grayscale and then to binary. A binary image is like grayscale, except instead of having multiple shades of gray, the only colors are black and white. This means there is a threshold that determines whether a pixel is black or white based on how dark the gray is for that pixel.
```python
self.img = raw[int(self.bot_y):int(self.top_y), int(self.left_x):int(self.right_x)] # crop to the square calculated earlier
self.gray = cv2.cvtColor(self.img, cv2.COLOR_BGR2GRAY)
# THRESH_OTSU is a special kind of thesholding that determines the B/W threshold automatically.
self.thresh, self.bw_mask = cv2.threshold(self.gray, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
```
![Cropped](/assets/images/posts/cropped.png){:style="display: block; margin: 0 auto;"}
<figcaption>A grayscale image of a square after cropping</figcaption> \
Otsu's Binarization method attempts to automatically determine an optimal global threshold for the image by picking a point in between the most prevalent colors in a bimodal image. OpenCV's documentation goes into thresholding in depth [here](https://docs.opencv.org/4.x/d7/d4d/tutorial_py_thresholding.html){:target="_blank"}. \
Below is what a binary image of the board looks like. You will notice that the black checkers do not show on the board. This is because when compared to the board as a whole, their color is too similar to the square they are on. This is why it is important to seperate the board into 64 seperate images. When this happens, the black pieces stand out clearly because they are still a different shade of black from the checkerboard they sit on.
![Binary](/assets/images/posts/binary.png){:style="display: block; margin: 0 auto; width: 50%;"}
<figcaption>Binary thresholding of the entire board</figcaption> \
Once the image is converted to binary you can choose many approaches. One is to calculate the contour of the shape, which creates freeform lines that follow the outline of the image. I go more in depth into this in my [webcam hand tracking post]({% post_url 2020-04-10-webcam-hand-tracker %}){:target="_blank"}. Another method is to check points near the outside of the square against the center of the square. If they match, there is nothing on the square, if they don't it means the center is a different color and likely has a piece on it.
```python
self.contours, self.hierarchy = cv2.findContours(self.thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE) # calculate the contours of the binary shape
```
Unfortunatley, this doesn't do quite enough for me. Binary thresholding is useful for determining the presence of and object. However, I am also trying to figure out the color of the piece on the board.
<br><br>

## Getting piece color
To do this, I start by calculating the average color of the center of the square. In an 800x800 image, each square is appoximately 100x100, so I use a 19x19 square to represent the center. (Note: `self.color` here is the center color, not the color of the whole square.)
```python
color_list=[]
for i in range(int(self.center[1]-9), int(self.center[1]+10)): # loop through center-9 to center+9
    for i2 in range(int(self.center[0]-9), int(self.center[0]+10)): # loop through center-9 to center+9 but on the other axis :)
        color_list.append(raw[i][i2])
self.color = [sum([i[2] for i in color_list])/len(color_list), sum([i[1] for i in color_list])/len(color_list), sum([i[0] for i in color_list])/len(color_list)]
```
After getting the color of the center of the square, I have to also get the average color of the entire square.
```python
color_list=[]
for i in range(int(self.bot_y)+10, int(self.top_y)-9):
    for i2 in range(int(self.left_x)+10, int(self.right_x)-10):
        color_list.append(raw[i][i2])
self.whole_color = [sum([i[2] for i in color_list])/len(color_list), sum([i[1] for i in color_list])/len(color_list), sum([i[0] for i in color_list])/len(color_list)]
```
The final step after storing these colors in each Square object is to use them to check each square on the board. \
This code loops through each square and will contain the logic for determining what piece is on the square. Below I compare the difference on all 3 color channels. Note that `Square.initial_whole_color` is the same as `Square.whole_color` except it isn't updated when `Square.update()` is called. This way, the intital color is same as it was before any pieces were placed on the board. Placing pieces later won't affect the average background color of the square.
```python
board_format_list = [[],[],[],[],[],[],[],[]]
board_pieces_list = [[],[],[],[],[],[],[],[]]
for index1 in range(1,9):
    for index2 in range(1,9):
        board_pieces_list[index1-1].append(board_dict[str(index1)+str(index2)].piece) # Square.piece contains a string with the piece type.
        #                      Initial blank color of the square to check                  Center color of the square to check         check if diff >5 for all channels
        color_bool_list = [abs(board_dict[str(index1)+str(index2)].intitial_whole_color[i]-board_dict[str(index1)+str(index2)].color[i])<5 for i in range(3)]
        if all(color_bool_list):
            board_format_list[8-index1].append(' ') # blank if all color channels have <5 diff
        else:
            if sum(board_dict[str(index1)+str(index2)].color)>400: board_format_list[8-index1].append('W') # white piece if color sum for center average is brighter than 400
            else: board_format_list[8-index1].append('B') # black piece if color sum in center is less than 400
```
Printing the board now gives the following string, which is the correct layout for the start of a checkers game.
```
  B   B   B   B 
B   B   B   B   
  B   B   B   B 
                
                
W   W   W   W   
  W   W   W   W 
W   W   W   W   
```
```python
def print_board(board_format_list):
    for i in board_format_list:
        for val in i:
            print(val, end=' ')
        print('')
```
And with that, step 1 of the code is complete. So far, this code just takes a picture of a chess board and determines the location and color of the pieces on the board. This works perfectly for checkers, but to determine what chess piece is on the board, more code is required.
<br><br>

## Tracking the progression of a chess game
As mentioned previously, if the pieces could be tracked as they moved through the board from start to finish, the initial starting position of a chess board could be used to track which pieces went where, even though the image detection cannot directly tell the type of piece. \
\
The first step after scanning the board initially and finding the homography matrix to warp the image would be to wait until the board reaches a starting state. For chess this just means that white and black pieces are lined up in the top and bottom rows of the image.
```python
while not found_starting:
    ret, frame = video.read() # read data from a video feed (instead of an image)
    raw_out = cv2.warpPerspective(frame, h, dsize) # warp the image according to the warp matrix
    board_update(board_dict, raw_out) # update the colors on the board, this function calls the Square.update function for all squares
    board_list, board_pieces_list = list_board(board_dict) # this function contains the code that checks where B&W pieces are located
    if board_list==[['W','W','W','W','W','W','W','W'],
                    ['W','W','W','W','W','W','W','W'],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    [' ',' ',' ',' ',' ',' ',' ',' '],
                    ['B','B','B','B','B','B','B','B'],
                    ['B','B','B','B','B','B','B','B']]: # check if all pieces are lined up in the starting rows
        found_starting = True
```
At this point, these pieces need to correlate to actual names of pieces. The `python-chess` module is useful for this.
```python
chess_board = chess.Board(chess.STARTING_FEN) # create a Board object with all pieces at starting locations
white_count = 16
black_count = 16
last_valid_board_list = board_list # keep track of the last frame in which pieces were in a valid position
whites_turn = True
```
A `chess.Board` object can be printed and looks something like this.
```python
>>> board = chess.Board("r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4") # a FEN (different from chess.STARTING_FEN)
>>> print(board)
r . b q k b . r
p p p p . Q p p
. . n . . n . .
. . . . p . . .
. . B . P . . .
. . . . . . . .
P P P P . P P P
R N B . K . N R
```
I then start a loop that does the same calculations that were done for the first 4 lines of the waiting block for every frame.
```python
while True:
    ret, frame = video.read() # read a frame
    raw_out = cv2.warpPerspective(frame, h, dsize) # warp
    board_update(board_dict, raw_out) # update colors
    board_list, board_pieces_list = list_board(board_dict) # update piece locations
```
Each time a new board is captured there are several steps that have to occur. First, it has to be a proper board (this means no hands in the way or anything like that). Second, a piece has to have moved. Almost every frame of the video feed will look nearly the same as the last, so this frame must have a piece in a different position. Finally, the piece moved has to be a valid move. A piece can replace a piece of the opposite color (capture) or a piece can appear on a blank square (move), but the piece that was on the now-empty square must be capable of making the move to where a new piece is. \
First is checking that the board is proper.
```python
white_count = [x for l in board_list for x in l].count('W') # count number of white pieces on this frame
black_count = [x for l in board_list for x in l].count('B') # count number of black pieces on this frame
valid = False
if whites_turn:
    # if it is white's turn, white should have the same number of pieces and black should have the same or one less
    if white_count==old_white_count and (black_count==old_black_count or black_count==old_black_count-1): valid = True
else:
    # if it is black's turn, black should have the same number of pieces and white should have the same or one less
    if black_count==old_black_count and (white_count==old_white_count or white_count==old_white_count-1): valid = True
```
On any move in chess, the color who's turn it is cannot lose or gain any pieces. The opponent can lose 1 piece or 0 pieces but cannot lose more than 1 or gain pieces. This code simply checks that the number of pieces counted on the board lines up with how many pieces there should be, since a hand blocking the table could cause a different number of pieces to be read on many frames. \
\
The second step is to check if a piece moved. My solution for this step is probably more complicated than it needs to be, but the goal is to check if anywhere on the board, a previously occupied space is now empty (of the correct color) and piece has either swapped colors or appeared where the square used to be blank.
```python
def piece_moved(prev_board_list, board_list, piece_list, whites_turn): #checks if a piece moved
    prev_arr = np.array(prev_board_list)
    arr = np.array(board_list)
    difference = prev_arr!=arr # construct a binary array that compares the string/piece of each square in the new and old board list
    if np.count_nonzero(difference)==2: # a valid change only occured if exactly 2 squares had a piece or color change
        locations = np.where(difference) # indicies where the value is True (a piece changed color or a square became occupied/unoccupied)
        p1, p2 = (locations[0][0], locations[1][0]), (locations[0][1], locations[1][1]) # extract the coodinates of the 2 changed squares
        if whites_turn:
            # a moved piece would occur if p1 becomes unoccupied (and was initially white) and p2 becomes occupied (and was initially black or empty)
            if (arr[p1]=='W' and arr[p2]==' ' and prev_arr[p2]=='W' and (prev_arr[p1]==' ' or prev_arr[p1]=='B')): #piece moved from p1 to p2.
                piece_list[p1[0]][p1[1]] = piece_list[p2[0]][p2[1]] # if so, update the piece list with the changed locations
                piece_list[p2[0]][p2[1]] = ' '
                return True, p2, p1
            # the same would also occur if p2 and p1 were swapped since they are arbritary and either can be the starting point
            elif (arr[p2]=='W' and arr[p1]==' ' and prev_arr[p1]=='W' and (prev_arr[p2]==' ' or prev_arr[p2]=='B')):  #piece moved from p2 to p1.
                piece_list[p2[0]][p2[1]] = piece_list[p1[0]][p1[1]]
                piece_list[p1[0]][p1[1]] = ' '
                return True, p1, p2
        else:
            # a moved piece would occur if p1 becomes unoccupied (and was initially black) and p2 becomes occupied (and was initially white or empty)
            if (arr[p1]=='B' and arr[p2]==' ' and prev_arr[p2]=='B' and (prev_arr[p1]==' ' or prev_arr[p1]=='W')): #piece moved from p1 to p2.
                piece_list[p1[0]][p1[1]] = piece_list[p2[0]][p2[1]]
                piece_list[p2[0]][p2[1]] = ' '
                return True, p2, p1
            # same thing for black, account for if p1 and p2 are in a different order
            elif (arr[p2]=='B' and arr[p1]==' ' and prev_arr[p1]=='B' and (prev_arr[p2]==' ' or prev_arr[p2]=='W')): #piece moved from p2 to p1.
                piece_list[p2[0]][p2[1]] = piece_list[p1[0]][p1[1]]
                piece_list[p1[0]][p1[1]] = ' '
                return True, p1, p2
    return False, None, None # if the number of changed squares !=2 or does not follow the correct scheme of changing colors, it is not a move.
```
You will notice I have not put in code for castling. In that case, 4 squares would change instead of 2, I never got around to it before my college quarter started haha. \
\
The final step is to check if a move is valid. Even if a piece moves to a new square or moves to replace another piece, that does not necessarily mean the move is legal. For example, moving my queen from its starting position to take the enemy king would be seen as a move occuring by the previous 2 functions. However, it is most certainly not a legal move in chess. This is where the `chess` library comes in handy again. `piece_moved()` returns 3 arguments. The first is if the move was valid, and the second two are the square the piece moved from and the square it moved to. Using `chess_board.pseudo_legal_moves` I can check if moving the piece to a new square was a valid move.
```python
# chess.A1 = 0, chess.B1 = 1, chess.A2 = 9, chess.H8 = 63 etc.
from_num = from_square[0]*8+from_square[1] # format the from_square variable to a square position the chess module understands
to_num = to_square[0]*8+to_square[1] # do the same for the to_square
return chess.Move(from_num, to_num) in chess_board.pseudo_legal_moves # check if the move is in the list of legal moves for the current board
```
Since the code has already confirmed that only one piece has moved and the correct color has moved, the `chess` library makes it incredibly easy to check if this is a valid move. `chess.Board` objects automatically keep track of all piece positions and the player who's turn it is, in order to make the determination of what is a legal move. \
\
If all three steps are true, and this frame does indeed contain a valid change from the last valid frame, the last step is just to update the variables that track the game state.
```python
chess_board.push(chess.Move(from_num, to_num)) # make the move that was just confirmed to be valid on the chess.Board object
set_position(board_dict, board_pieces_list) # make the move on the custom board dict that tracks piece position and color 
last_valid_board_list = board_list.copy() # store this new board configuration as the last valid board configuration
old_white_count, old_black_count = white_count, black_count # update the number of pieces on the board
whites_turn = not whites_turn # change who's turn it is

def set_position(board_dict, pieces_list):
    for index1 in range(1,9): # for all 64 Square objects.
        for index2 in range(1,9):
            board_dict[str(index1)+str(index2)].piece = pieces_list[index1-1][index2-1] # update the Square objects
```
Now the board state is being tracked within this while loop!
<br><br>

## Concluding notes
As mentioned at the beginning, I scaled the scope back because I couldn't find a dataset to help me detect what kind of piece a chess piece was. The method I chose instead is still a work in progress and comes with some caveats. Every move have to be seen by the camera. If a player moves their hand over to move a piece and the other player moves their hand to move next before the first player finishes moving their hand, it is possible that a move will be made without the program being able to tell. No moves from this point out will be detected as valid since the last state saved in the program would actually be the state of the board from more than one turn ago, making it impossible to evaluate where which pieces moved after. \
\
The code tracking the piece positions is also partially incomplete. Since the while loop is infinite, when a checkmate occurs, it will just keep looping. Since the opposing side has no valid moves when checkmated (the definition of a checkmate), the loop will continue, calling every frame an invalid move. In addition, castling moves cannot be documented, as parts of the code do not support 2 piece moving on the same turn. The chess library does have support for all these scenarios however. There is an `chess.Outcome` class that contains data of which side won as well as a `chess.Termination` class with data on why the game ended (checkmate, stalemate, insufficient material, fifty move rule, etc). In addition, the chess library does have support for castling and promotion as moves, so these edge cases for move validity that my program does not support could be programmed in. \
\
If you read this long article to the end, thank you! I really enjoyed this project and writing up this explanation of how it works. I hope you learned some new general computer vision strategies and maybe some OpenCV functions you can use in your next project!