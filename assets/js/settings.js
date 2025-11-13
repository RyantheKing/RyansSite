const cursorCheckbox = document.getElementById("cursorToggle");
const crashCheckbox = document.getElementById("crashfishToggle");
const root = document.documentElement;

const storeCursor = localStorage.getItem("cursorEnabled");
const storeCrash = localStorage.getItem("crashEnabled");

let cursorEnabled;
if (storeCursor === null) {
  cursorEnabled = true;
} else {
  cursorEnabled = storeCursor === "true";
}

let crashEnabled;
if (storeCrash === null) {
  crashEnabled = true;
} else {
  crashEnabled = storeCrash === "true";
}

cursorCheckbox.checked = cursorEnabled;
crashCheckbox.checked = crashEnabled;

root.classList.toggle("custom-cursor", cursorEnabled);

window.onload = () => {
  if (crashEnabled) {
    oneko();
  }

  cursorCheckbox.addEventListener("change", () => {
    const isCursor = cursorCheckbox.checked;
    root.classList.toggle("custom-cursor", isCursor);
    localStorage.setItem("cursorEnabled", isCursor);
  });

  crashCheckbox.addEventListener("change", () => {
    const isCrash = crashCheckbox.checked;
    if (isCrash) {
      oneko();
    } else {
      const el = document.getElementById("oneko");
      if (el) {
        el.remove();
      }
    }
    localStorage.setItem("crashEnabled", isCrash);
  });
};