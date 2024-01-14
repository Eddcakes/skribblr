// check so we don't try add this function twice
if (typeof init === "undefined") {
  const init = () => {
    chrome.runtime.onMessage.addListener(messageListener);
    initialiseScreenshotButton();
    initialiseClockObserver();
    initialisePlayerListObserver();
  };
  init();
}

let currentStatus = {
  round: "initial",
  timerScreenshotTaken: false,
};

function messageListener(message, sender, sendResponse) {
  switch (message.type) {
    case "screenshot":
      downloadScreenshot(message.value);
      break;
    default:
      console.log("cannot find handler for: ", message.type);
  }
}

function initialiseScreenshotButton() {
  const screenshotButton = document.createElement("button");
  screenshotButton.id = "quick-screenshot";
  screenshotButton.innerText = "Screenshot";
  screenshotButton.addEventListener("click", requestScreenshot);
  document.body.appendChild(screenshotButton);
}

function requestScreenshot() {
  chrome.runtime.sendMessage({
    type: "takeScreenshot",
  });
}

function downloadScreenshot(dataUrl) {
  const blob = dataUrlToBlob(dataUrl);
  const imageLink = document.createElement("a");
  imageLink.href = URL.createObjectURL(blob);
  const fileName = createFileName();
  imageLink.download = fileName;
  imageLink.click();
  // user needs to set their browser settings to not always ask for download location
  // we cannot choose a path on their machine, so user should create a folder in the downloads folder
  // and set downloads to go here
  // create a desktop helper app to move all files with the name format of skribbl-screenshot names to a folder
  // to stop downloads being spammed
}

// Function to convert Data URL to Blob
function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  /* Buffer is a node api, so how can we do this without atob? */
  const bstr = atob(arr[1]);
  let n = bstr.length;
  let u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function initialiseClockObserver() {
  const clock = document.querySelector("#game-clock");
  // do I need all these?
  const config = { attributes: true, childList: true, subtree: true };
  const callback = (mutationList, observer) => {
    for (const mutation of mutationList) {
      if (mutation.type === "childList") {
        // when it ticks
        const time = Number(mutation?.addedNodes?.[0]?.data);
        if (isNaN(time)) {
          console.log("Cannot find time");
          return;
        }
        // reset timerScreenshotTaken if we are waiting for a new round
        if (time > 30 && getScreenshotTaken()) {
          currentStatus.timerScreenshotTaken = false;
        }
        if (time < 3 && !getScreenshotTaken()) {
          if (shouldTakeScreenshot()) {
            {
              console.log("Requesting screenshot on time running out");
              requestScreenshot();
              setScreenshotTaken();
            }
          }
        }
      }
    }
  };
  const observer = new MutationObserver(callback);
  observer.observe(clock, config);
  // will we ever need to disconnect?
  // observer.disconnect();
}

function initialisePlayerListObserver() {
  const playersList = document.querySelector(".players-list");
  const config = { attributes: true, childList: false, subtree: true };
  const callback = (mutationList, observer) => {
    for (const mutation of mutationList) {
      if (mutation.type === "attributes") {
        const totalPlayers = playersList.childNodes.length;
        let guessedPlayers = 0;
        playersList.childNodes.forEach((player) => {
          if (player.classList.contains("guessed")) {
            guessedPlayers++;
          }
        });
        // -2 => 1 for last person to guess, 1 for the person drawing
        if (guessedPlayers === totalPlayers - 2) {
          if (shouldTakeScreenshot()) {
            console.log("Requesting screenshot on most players guessed");
            requestScreenshot();
          }
        }
      }
    }
  };
  const observer = new MutationObserver(callback);
  observer.observe(playersList, config);
}

function shouldTakeScreenshot() {
  const waiting = "WAITING";
  const gameStatus = document.querySelector(
    "#game-word .description"
  ).innerText;
  if (gameStatus === waiting) {
    return false;
  } else {
    return true;
  }
}

function getScreenshotTaken() {
  return currentStatus.timerScreenshotTaken;
}

function setScreenshotTaken() {
  currentStatus.timerScreenshotTaken = true;
}

// {nick}-{word}-{timestamp}
// refactor this to be more readable (helper functions)
function createFileName() {
  let fileName = "";
  let inGame = false;
  const drawingElements = document.querySelectorAll(".drawing");
  drawingElements.forEach((element) => {
    if (element.style.display === "block") {
      inGame = true;
      // .closest can let us search parents
      const player = element.closest(".player");
      let playerName = player.querySelector(".player-name").innerText;
      playerName = playerName.replace(" (You)", "");
      playerName = playerName.replace(" ", "_");
      // whitelist
      const whitelist = /[^a-z0-9\-]/gi;
      playerName = playerName.replace(whitelist, "");
      fileName += playerName;
    }
  });
  if (!inGame) {
    // no one is drawing
    fileName = "general";
  }
  // word
  let word = "";
  // hints and draw this do not get overwritten if you change role, so we need to check role
  const artist = "DRAW THIS"; // or "GUESS THIS" for guesser
  const descriptionSelector = "#game-word .description";
  const hintsSelector = "#game-word .hints .container";
  const wordDescription = document.querySelector(descriptionSelector).innerText;
  if (wordDescription === artist) {
    // we have the word
    word = document.querySelector(`#game-word .word`).innerText;
    // we would have to count length if we need word length
  } else {
    const hints = document.querySelector(hintsSelector).childNodes;
    hints.forEach((node) => {
      if (node.classList.contains("uncover")) {
        if (node.innerText === "") {
          word += " ";
        } else {
          word += node.innerText;
        }
      } else {
        word += "_";
      }
    });
  }
  fileName += `-${word}`;

  // timestamp
  // 2023-11-18T171954
  // pad the time if its single digit
  const pad = (n) => (n < 10 ? "0" + n : n);
  const time = new Date();
  const formattedTime = `${time.getFullYear()}-${pad(
    time.getMonth() + 1
  )}-${pad(time.getDate())}T${pad(time.getHours())}${pad(
    time.getMinutes()
  )}${pad(time.getSeconds())}`;
  fileName += `-${formattedTime}.png`;
  return fileName;
}
