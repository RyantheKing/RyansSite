// oneko.js: https://github.com/adryd325/oneko.js

function randomCoord(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

(function oneko() {
    const isReducedMotion =
      window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
      window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;
  
    if (isReducedMotion) return;
  
    const nekoEl = document.createElement("div");
  
    let nekoPosX = randomCoord(32, window.innerWidth - 63);
    let nekoPosY = randomCoord(32, window.innerHeight - 63);
  
    let mousePosX = nekoPosX - 32;
    let mousePosY = nekoPosY - 32;
    let mouseDown = false;
  
    let frameCount = 0;
    let idleTime = 0;
    let idleAnimation = null;
    let idleAnimationFrame = 0;
  
    const nekoSpeed = 10;
    const spriteSets = {
      idle: [[-3, -3]],
      alert: [[-7, -3]],
      scratchSelf: [
        [-5, 0],
        [-6, 0],
        [-7, 0],
      ],
      scratchWallN: [
        [0, 0],
        [0, -1],
      ],
      scratchWallS: [
        [-7, -1],
        [-6, -2],
      ],
      scratchWallE: [
        [-2, -2],
        [-2, -3],
      ],
      scratchWallW: [
        [-4, 0],
        [-4, -1],
      ],
      tired: [[-3, -2]],
      sleeping: [
        [-2, 0],
        [-2, -1],
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
    };
  
    function init() {
      nekoEl.id = "oneko";
      nekoEl.ariaHidden = true;
      nekoEl.style.width = "32px";
      nekoEl.style.height = "32px";
      nekoEl.style.position = "fixed";
      nekoEl.style.pointerEvents = "none";
      nekoEl.style.backgroundImage = "url('/assets/images/oneko.gif')";
      nekoEl.style.imageRendering = "pixelated";
      nekoEl.style.left = `${nekoPosX - 16}px`;
      nekoEl.style.top = `${nekoPosY - 16}px`;
      nekoEl.style.zIndex = 2147483647;
  
      document.body.appendChild(nekoEl);
  
      document.addEventListener("mousemove", function (event) {
        mousePosX = event.clientX;
        mousePosY = event.clientY;
      });
      document.addEventListener("mousedown", toggleMouseState);
      document.addEventListener("mouseup", toggleMouseState);
  
      window.requestAnimationFrame(onAnimationFrame);
    }

    function toggleMouseState(e) {
      var flags = e.buttons !== undefined ? e.buttons : e.which;
      mouseButtonDown = (flags & 1) === 1;
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
        lastFrameTimestamp = timestamp
        frame()
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
  
      // every ~ 20 seconds
      if (idleTime > 10 && Math.floor(Math.random() * 20) == 0 && idleAnimation == null) {
        let avalibleIdleAnimations = ["sleeping"];
        if (nekoPosX < 32) {
          avalibleIdleAnimations.push("scratchWallW");
        }
        if (nekoPosY < 32) {
          avalibleIdleAnimations.push("scratchWallN");
        }
        if (nekoPosX > window.innerWidth - 32) {
          avalibleIdleAnimations.push("scratchWallE");
        }
        if (nekoPosY > window.innerHeight - 32) {
          avalibleIdleAnimations.push("scratchWallS");
        }
        if ((nekoPosY < window.innerHeight - 32) && (nekoPosX < window.innerWidth - 32) && (nekoPosY > 32) && (nekoPosX > 32)) {
          avalibleIdleAnimations.push("scratchSelf");
        }
        idleAnimation =
          avalibleIdleAnimations[
            Math.floor(Math.random() * avalibleIdleAnimations.length)
          ];
      }
  
      switch (idleAnimation) {
        case "sleeping":
          if (idleAnimationFrame < 8) {
            setSprite("tired", 0);
            break;
          }
          setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
          if (idleAnimationFrame > 192) {
            resetIdleAnimation();
          }
          break;
        case "scratchWallN":
        case "scratchWallS":
        case "scratchWallE":
        case "scratchWallW":
        case "scratchSelf":
          setSprite(idleAnimation, idleAnimationFrame);
          if (idleAnimationFrame > 9) {
            resetIdleAnimation();
          }
          break;
        default:
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
      if (distance < nekoSpeed || distance < 32 || (distance < 48 && mousePosX > 10 && mousePosX < window.innerWidth-10 && mousePosY > 10 && mousePosY < window.innerHeight-10)) {
        idle();
        return;
      }
  
      idleAnimation = null;
      idleAnimationFrame = 0;
  
      if (idleTime > 1) {
        setSprite("alert", 0);
        // count down after being alerted before moving
        idleTime = Math.min(idleTime, 7);
        idleTime -= 1;
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
  })();