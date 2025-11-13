// oneko.js: https://github.com/adryd325/oneko.js

function randomCoord(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function isOnTopOfAnyElement(x, y, selectors) {
  const el = document.elementFromPoint(x, y);
  if (!el) {
    return true;
  }
  return el.matches(selectors);
}

function generateSpawn(minH, minV, maxH, maxV) {
  let x, y;
  do {
    x = randomCoord(minH, maxH);
    y = randomCoord(minV, maxV);
  } while (isOnTopOfAnyElement(x, y, "p, a, i, h1, h2, h3, h4, h5, h6, img, label, input"))
  return [x, y];
}

function oneko() {
  const isReducedMotion =
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
    window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

  if (isReducedMotion) return;

  const nekoEl = document.createElement("div");

  // let nekoPosX = randomCoord(32, window.innerWidth - 63);
  // let nekoPosY = randomCoord(32, window.innerHeight - 63);
  let [nekoPosX, nekoPosY] = generateSpawn(32, 32, window.innerWidth - 63, window.innerHeight - 63);
  
  let mousePosX = nekoPosX;
  let mousePosY = nekoPosY;

  let frameCount = 0;
  let idleTime = 0;
  let moved = false;
  let exists = true;
  let stall = 7;
  let idleAnimation = null;
  let idleAnimationFrame = 0;
  let mouseInWindow = true;

  const nekoSpeed = 8;
  const spriteSets = {
    alert: [
      [-6, 0],
      [-7, 0],
    ],
    idle: [[-5, 0]],
    peek: [
      [-6, 0],
      [-6, 0],
      [-6, 0],
      [-6, 0],
      [-6, 0],
      [-6, 0],
    ],
    N: [
      [-1, -2],
      [-1, -3],
    ],
    NE: [
      [0, -2],
      [0, -3],
    ],
    E: [
      [-3, 0],
      [-3, -1],
    ],
    SE: [
      [-5, -1],
      [-5, -2],
    ],
    S: [
      [-6, -3],
      [-7, -2],
    ],
    SW: [
      [-5, -3],
      [-6, -1],
    ],
    W: [
      [-4, -2],
      [-4, -3],
    ],
    NW: [
      [-1, 0],
      [-1, -1],
    ],
    explosion: [
      [0, 0],
      [0, -1],
      [-2, -2],
      [-2, -3],
      [-4, 0],
      [-4, -1],
      [-6, -2],
      [-7,-1],
    ]
  };

  function init() {
    let nekoFile = "/assets/images/crashfish.gif"
    const curScript = document.currentScript
    if (curScript && curScript.dataset.cat) {
      nekoFile = curScript.dataset.cat
    }
  
    nekoEl.id = "oneko";
    nekoEl.ariaHidden = true;
    nekoEl.style.width = "32px";
    nekoEl.style.height = "32px";
    nekoEl.style.position = "fixed";
    nekoEl.style.pointerEvents = "none";
    nekoEl.style.imageRendering = "pixelated";
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
    nekoEl.style.zIndex = 2147483647;

    nekoEl.style.backgroundImage = `url(${nekoFile})`;
    
    document.body.appendChild(nekoEl);

    document.addEventListener("mousemove", (event) => {
      mousePosX = event.clientX;
      mousePosY = event.clientY;
    });

    document.addEventListener("mouseout", (event) => {
      if (!event.relatedTarget && !event.toElement && mouseInWindow) {
        mouseInWindow = false;
      }
    });

    document.addEventListener("mouseover", (event) => {
      if (!event.relatedTarget && !event.fromElement && !mouseInWindow) {
        mouseInWindow = true;
        moved = true;
      }
    });

    setSprite("idle", 0);
    
    window.requestAnimationFrame(onAnimationFrame);
  }

  let lastFrameTimestamp;

  function onAnimationFrame(timestamp) {
    // Stops execution if the neko element is removed from DOM
    if (!nekoEl.isConnected) {
      return;
    }
    if (!lastFrameTimestamp) {
      lastFrameTimestamp = timestamp;
    }
    if (timestamp - lastFrameTimestamp > 100) {
      lastFrameTimestamp = timestamp;
      frame();
    }
    window.requestAnimationFrame(onAnimationFrame);
  }

  function setSprite(name, frame) {
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function idle() {
    idleTime += 1;

    if (!mouseInWindow && exists && moved) {
      if (idleAnimationFrame < 3) {
        setSprite("alert", 1);
      } else if (idleAnimationFrame < 5) {
        setSprite("alert", 0);
      } else {
        setSprite("idle", 0);
        resetIdleAnimation();
        moved = false;
        return;
      }
      idleAnimationFrame += 1;
      return;
    }

    if (moved) {
      if (idleAnimationFrame > 40 && Math.floor(Math.random() * 30) == 0) {
        resetIdleAnimation();
        moved = false;
        setSprite("idle", 0);
        [nekoPosX, nekoPosY] = generateSpawn(32, 32, window.innerWidth - 63, window.innerHeight - 63);
        mousePosX = nekoPosX;
        mousePosY = nekoPosY;
        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
        exists = true;
        stall = 7;
        return;
      }
      if (idleAnimationFrame < 8) {
        exists = false;
        setSprite("explosion", idleAnimationFrame);
      }
      idleAnimationFrame += 1;
      return;
    }
    // every ~ 10 seconds
    if (
      (idleTime > 15 &&
      Math.floor(Math.random() * 100) == 0) || idleAnimationFrame > 0
    ) {
      setSprite("peek", idleAnimationFrame);
      if (idleAnimationFrame > 4) {
        resetIdleAnimation();
        return;
      }
    } else {
      setSprite("idle", 0);
      return;
    }
    idleAnimationFrame += 1;
  }

  function frame() {
    frameCount += 1;
    const diffX = nekoPosX - mousePosX;
    const diffY = nekoPosY - mousePosY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (stall > 0) {
      stall--;
      idleTime = 7;
      return;
    }

    if (distance < nekoSpeed || distance < 17 || exists == false || !mouseInWindow) {
      idle();
      return;
    }
    if (!exists) {
      return;
    }
    moved = true;

    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      // count down after being alerted before moving
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      if (idleTime < 2) {
        setSprite("alert", 1);
      }
      return;
    }

    let direction;
    direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction, frameCount);

    nekoPosX -= (diffX / distance) * nekoSpeed;
    nekoPosY -= (diffY / distance) * nekoSpeed;

    nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
    nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
  }

  init();
}